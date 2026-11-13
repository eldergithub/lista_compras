/**
 * NaLista IA — o "porteiro" entre o app e o OpenRouter (Cloudflare Worker).
 *
 * Guarda a chave do OpenRouter e só repassa pedidos que:
 *  - vêm do endereço do app (ORIGENS);
 *  - trazem o código da família (cabeçalho X-Codigo = CODIGO_FAMILIA);
 *  - usam só modelos gratuitos (terminados em ":free" ou o openrouter/free).
 * Não guarda fotos nem textos: recebe, repassa, devolve.
 *
 * Tarefas: lista-foto (foto de lista), corredor-foto (placas de corredor),
 * lista-texto (o que foi ditado, para separar e corrigir os itens),
 * itens-corredores (em que corredor fica cada produto), ping (teste).
 *
 * Configuração no painel da Cloudflare (Settings → Variables and Secrets):
 *  - OPENROUTER_KEY   (Secret)  a chave sk-or-... do OpenRouter
 *  - CODIGO_FAMILIA   (Secret)  uma senha que a família digita uma vez no app
 *  - ORIGENS          (Text, opcional)  padrão: https://eldergithub.github.io
 *  - MODELOS          (Text, opcional)  modelos em ordem de preferência, separados por vírgula
 */

const ORIGENS_PADRAO = 'https://eldergithub.github.io';
// Modelos de visão gratuitos, do mais preciso para o mais leve. Os pequenos
// (Omni, 3B ativos) inventavam itens em letra de mão; ficam só de reserva.
const MODELOS_PADRAO = 'nvidia/nemotron-3.5-super-vl:free,thinkingmachines/inkling-2-small:free,nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free,openrouter/free';
const TEMPO_POR_MODELO = 40000; // modelo gratuito em fila: desiste e tenta o próximo
const TAMANHO_MAXIMO = 6_000_000; // ~6 MB: a foto já chega reduzida pelo app

const PROMPT_FOTO = `Você lê fotos de listas de compras (em papel, quadro branco ou tela), escritas à mão ou impressas, em português do Brasil.
Responda SOMENTE com os itens, um por linha, neste formato:
- Nome — quantidade unidade (observação)
Como ler:
1. Leia cada linha escrita, de cima para baixo, letra por letra. Cada linha escrita vira no máximo um item (ou mais, se estiverem separados por vírgula).
2. Letra de mão costuma ter letras malfeitas ou trocadas. Cada item é um produto de supermercado ou de casa que existe: escolha o produto real mais parecido com o que está escrito ("Varsouha" é "Vassoura", "arros" é "Arroz", "sabao em po" é "Sabão em pó").
3. NUNCA escreva um produto que não esteja na foto. Não acrescente itens comuns que "costumam" estar em listas. Não invente quantidades: só ponha quantidade se houver número escrito.
4. Se uma palavra estiver ilegível, escreva sua melhor leitura dela, sem trocar por outro produto qualquer.
Regras:
- Omita quantidade e observação quando não houver. Exemplos: "- Arroz — 5 kg", "- Leite — 6 un (integral)", "- Banana".
- Mantenha marcas. Ignore riscos, rabiscos, pontos soltos, reflexos, datas, preços e totais.
- Item riscado na lista já foi comprado: ignore.
- Se a foto não tiver uma lista, responda apenas: NENHUM`;

const PROMPT_CORREDOR = (categorias) => `Você lê fotos de placas de corredor de supermercado no Brasil.
Para cada corredor que aparece na foto, responda UMA linha neste formato:
Nome do corredor | categorias | produtos
- Nome: como está na placa ("Corredor 7", "Hortifrúti", "Padaria"). Se a placa tiver número, use "Corredor N".
- Categorias: escolha só desta lista, separadas por ponto e vírgula: ${categorias.join('; ')}
- Produtos: TUDO o que está escrito na placa, em minúsculas, separado por vírgula, inclusive seções genéricas ("laticínios, iogurtes, higiene bucal, macarrão, enlatados").
Não invente produtos que não estão na placa. Se não houver placa legível, responda apenas: NENHUM`;

const PROMPT_ITENS = `Você ajuda a achar produtos num supermercado brasileiro.
Recebe os corredores do mercado (nome e o que diz a placa) e uma lista de produtos.
Para CADA produto, responda uma linha neste formato:
Produto | Nome do corredor
- Use o nome do corredor exatamente como veio na lista.
- Pense em onde o produto costuma ficar: placa "laticínios" recebe iogurte, queijo, manteiga e leite; "higiene" recebe sabonete, pasta de dente e papel higiênico; "mercearia" recebe arroz, feijão, óleo e café.
- Se nenhum corredor servir, use: Produto | ?
Não escreva mais nada.`;

const PROMPT_TEXTO = `Você recebe o que uma pessoa ditou para a lista de compras (português do Brasil), já convertido em texto pelo celular, com erros de reconhecimento de voz.
Responda SOMENTE com os itens, um por linha, neste formato:
- Nome — quantidade unidade (observação)
Regras:
- Separe os itens mesmo quando vierem grudados ("arroz feijão leite" são três itens).
- Corrija palavras entendidas errado pelo microfone quando for óbvio pelo contexto ("feijão preto dois quilo" vira "- Feijão preto — 2 kg").
- Unidades: un, kg, g, L, cx, pct. Números por extenso viram algarismos. Dúzia vira 12 un.
- Ignore palavras que não são itens ("é", "também", "e mais", "anota aí", "vírgula", "próximo").
- Não invente itens. Se não houver nenhum item, responda apenas: NENHUM`;

export default {
  async fetch(req, env) {
    const origens = (env.ORIGENS || ORIGENS_PADRAO).split(',').map((s) => s.trim()).filter(Boolean);
    const origem = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': origens.includes(origem) ? origem : origens[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Codigo',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    const responder = (obj, status = 200) => new Response(JSON.stringify(obj), {
      status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
    });

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return responder({ erro: 'Use POST.' }, 405);
    if (!origens.includes(origem)) return responder({ erro: 'Endereço não autorizado.' }, 403);
    if (!env.OPENROUTER_KEY || !env.CODIGO_FAMILIA) return responder({ erro: 'O porteiro ainda não foi configurado.' }, 500);
    if (req.headers.get('X-Codigo') !== env.CODIGO_FAMILIA) return responder({ erro: 'Código da família errado.' }, 401);
    if (Number(req.headers.get('Content-Length') || 0) > TAMANHO_MAXIMO) return responder({ erro: 'Foto grande demais.' }, 413);

    let corpo;
    try { corpo = await req.json(); } catch { return responder({ erro: 'Pedido inválido.' }, 400); }

    // Teste do app (Ajustes → IA): confirma endereço e código sem gastar a cota.
    if (corpo?.tarefa === 'ping') return responder({ ok: true });

    const imagemValida = typeof corpo?.imagem === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(corpo.imagem);
    const comImagem = (pedido) => [{ type: 'text', text: pedido }, { type: 'image_url', image_url: { url: corpo.imagem } }];
    let mensagens;
    if (corpo?.tarefa === 'lista-foto' && imagemValida) {
      mensagens = [{ role: 'system', content: PROMPT_FOTO }, { role: 'user', content: comImagem('Transcreva a lista de compras desta foto.') }];
    } else if (corpo?.tarefa === 'corredor-foto' && imagemValida) {
      const categorias = (Array.isArray(corpo.categorias) ? corpo.categorias : [])
        .filter((c) => typeof c === 'string' && c.length <= 40).slice(0, 30);
      if (!categorias.length) return responder({ erro: 'Pedido inválido.' }, 400);
      mensagens = [{ role: 'system', content: PROMPT_CORREDOR(categorias) }, { role: 'user', content: comImagem('Leia as placas de corredor desta foto.') }];
    } else if (corpo?.tarefa === 'itens-corredores' && Array.isArray(corpo.corredores) && Array.isArray(corpo.itens)) {
      const curto = (v, n) => String(v ?? '').replace(/[\r\n|]+/g, ' ').slice(0, n).trim();
      const corredores = corpo.corredores.slice(0, 40).map((c) => `- ${curto(c?.nome, 40)}: ${curto(c?.placa, 300)}`).filter((l) => l.length > 3);
      const itens = corpo.itens.slice(0, 150).map((i) => curto(i, 60)).filter(Boolean);
      if (!corredores.length || !itens.length) return responder({ erro: 'Pedido inválido.' }, 400);
      mensagens = [{ role: 'system', content: PROMPT_ITENS }, { role: 'user', content: `Corredores:\n${corredores.join('\n')}\n\nProdutos:\n${itens.join('\n')}` }];
    } else if (corpo?.tarefa === 'lista-texto' && typeof corpo.texto === 'string' && corpo.texto.trim() && corpo.texto.length <= 4000) {
      mensagens = [{ role: 'system', content: PROMPT_TEXTO }, { role: 'user', content: corpo.texto }];
    } else {
      return responder({ erro: 'Pedido inválido.' }, 400);
    }

    const modelos = (env.MODELOS || MODELOS_PADRAO).split(',').map((s) => s.trim())
      .filter((m) => m.endsWith(':free') || m === 'openrouter/free');
    let ultimoErro = 'Nenhum modelo gratuito configurado.';

    // Tenta os modelos em ordem: se um estiver fora do ar ou lotado, vai para o próximo.
    const inicio = Date.now();
    const perguntar = async (modelo, semRaciocinio) => {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), TEMPO_POR_MODELO);
      try {
        return await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          signal: ctl.signal,
          headers: {
            Authorization: `Bearer ${env.OPENROUTER_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': origens[0],
            'X-Title': 'NaLista',
          },
          body: JSON.stringify({
            model: modelo,
            temperature: 0.1,
            max_tokens: 1500,
            // Ler uma lista não precisa de "pensar": sem raciocínio, a resposta vem muito mais rápido.
            ...(semRaciocinio ? { reasoning: { enabled: false } } : {}),
            messages: mensagens,
          }),
        });
      } finally {
        clearTimeout(t);
      }
    };
    for (const modelo of modelos) {
      try {
        let r = await perguntar(modelo, true);
        // Modelo que não aceita desligar o raciocínio: tenta de novo sem o pedido.
        if (r.status === 400) r = await perguntar(modelo, false);
        const dados = await r.json().catch(() => ({}));
        if (r.status === 429) { ultimoErro = 'Limite gratuito do dia atingido. Tente mais tarde.'; continue; }
        if (!r.ok) { ultimoErro = dados?.error?.message || `Erro ${r.status} no modelo.`; continue; }
        let texto = String(dados?.choices?.[0]?.message?.content || '');
        texto = texto.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```[a-z]*\n?|```/gi, '').trim();
        if (!texto) { ultimoErro = 'O modelo não respondeu.'; continue; }
        return responder({ texto, modelo: dados.model || modelo, ms: Date.now() - inicio });
      } catch (e) {
        ultimoErro = e?.name === 'AbortError' ? 'Os modelos gratuitos estão demorando demais agora. Tente de novo.' : 'Não consegui falar com o OpenRouter.';
      }
    }
    return responder({ erro: ultimoErro }, 502);
  },
};
