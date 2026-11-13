/**
 * NaLista IA — o "porteiro" entre o app e o OpenRouter (Cloudflare Worker).
 *
 * Guarda a chave do OpenRouter e só repassa pedidos que:
 *  - vêm do endereço do app (ORIGENS);
 *  - trazem o código da família (cabeçalho X-Codigo = CODIGO_FAMILIA);
 *  - usam só modelos gratuitos (terminados em ":free" ou o openrouter/free).
 * Não guarda fotos nem textos: recebe, repassa, devolve.
 *
 * Configuração no painel da Cloudflare (Settings → Variables and Secrets):
 *  - OPENROUTER_KEY   (Secret)  a chave sk-or-... do OpenRouter
 *  - CODIGO_FAMILIA   (Secret)  uma senha que a família digita uma vez no app
 *  - ORIGENS          (Text, opcional)  padrão: https://eldergithub.github.io
 *  - MODELOS          (Text, opcional)  modelos em ordem de preferência, separados por vírgula
 */

const ORIGENS_PADRAO = 'https://eldergithub.github.io';
const MODELOS_PADRAO = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free,openrouter/free';
const TAMANHO_MAXIMO = 6_000_000; // ~6 MB: a foto já chega reduzida pelo app

const PROMPT_FOTO = `Você lê fotos de listas de compras (escritas à mão ou impressas), em português do Brasil.
Responda SOMENTE com os itens, um por linha, neste formato:
- Nome — quantidade unidade (observação)
Regras:
- Omita quantidade e observação quando não houver. Exemplos: "- Arroz — 5 kg", "- Leite — 6 un (integral)", "- Banana".
- Corrija erros óbvios de escrita dos produtos ("arros" vira "Arroz", "sabao em po" vira "Sabão em pó"). Mantenha marcas.
- Não invente itens. Ignore riscos, rabiscos, datas, preços e totais.
- Item riscado na lista já foi comprado: ignore.
- Se a foto não tiver uma lista, responda apenas: NENHUM`;

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

    if (corpo?.tarefa !== 'lista-foto' || typeof corpo.imagem !== 'string'
      || !/^data:image\/(jpeg|png|webp);base64,/.test(corpo.imagem)) {
      return responder({ erro: 'Pedido inválido.' }, 400);
    }

    const modelos = (env.MODELOS || MODELOS_PADRAO).split(',').map((s) => s.trim())
      .filter((m) => m.endsWith(':free') || m === 'openrouter/free');
    let ultimoErro = 'Nenhum modelo gratuito configurado.';

    // Tenta os modelos em ordem: se um estiver fora do ar ou lotado, vai para o próximo.
    for (const modelo of modelos) {
      try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.OPENROUTER_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': origens[0],
            'X-Title': 'NaLista',
          },
          body: JSON.stringify({
            model: modelo,
            temperature: 0.1,
            max_tokens: 2000,
            messages: [
              { role: 'system', content: PROMPT_FOTO },
              { role: 'user', content: [
                { type: 'text', text: 'Transcreva a lista de compras desta foto.' },
                { type: 'image_url', image_url: { url: corpo.imagem } },
              ] },
            ],
          }),
        });
        const dados = await r.json().catch(() => ({}));
        if (r.status === 429) { ultimoErro = 'Limite gratuito do dia atingido. Tente mais tarde.'; continue; }
        if (!r.ok) { ultimoErro = dados?.error?.message || `Erro ${r.status} no modelo.`; continue; }
        let texto = String(dados?.choices?.[0]?.message?.content || '');
        texto = texto.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```[a-z]*\n?|```/gi, '').trim();
        if (!texto) { ultimoErro = 'O modelo não respondeu.'; continue; }
        return responder({ texto, modelo: dados.model || modelo });
      } catch {
        ultimoErro = 'Não consegui falar com o OpenRouter.';
      }
    }
    return responder({ erro: ultimoErro }, 502);
  },
};
