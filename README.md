# NaLista

**Monte, mande, marque.** App de listas para o celular (PWA): quem precisa monta a lista e manda por link; quem vai comprar marca item por item — no mercado, na farmácia ou onde for — e devolve o retorno. Funciona sem internet.

Marca e design system: tokens, símbolo, ícones e componentes no design system **NaLista** (Claude).

**Abrir:** https://eldergithub.github.io/lista_compras/

## Como usar

- **Editar → caixa de adicionar:** escreva ou fale vários itens de uma vez — `2 kg frango, pão, 6 leite e tomate`, `dois quilos de carne`, `meia dúzia de ovos`. A prévia mostra quantidade, unidade e categoria antes de entrar. Pelo microfone do teclado (Gboard) funciona igual.
- **Falar pelo app:** o botão de microfone ao lado da caixa ouve um item de cada vez (Chrome no Android, precisa de internet); o texto fica na caixa para conferir na prévia antes de adicionar.
- **Escolher por categoria:** grade de itens por categoria, conforme o tipo da lista; um toque põe na lista, outro toque aumenta a quantidade.
- **Listas prontas:** compra do mês, feira, café da manhã, churrasco, farmácia de casa, limpeza, pequenos reparos, aniversário e viagem. Escolha uma, desmarque o que não precisa e adicione tudo de uma vez.
- **Sugestões:** completa o nome com o que você já comprou e um catálogo de ~280 itens, cada um com a unidade de costume (banana em dz, carne em kg, leite em cx).
- **Itens de sempre** e **Repetir a última compra**, a partir do histórico guardado no aparelho.
- **Detalhes do item:** toque no nome para mudar nome, observação (`maduras`, `marca X`), categoria e quantidade.
- Item repetido soma a quantidade; remover, apagar e importar têm **Desfazer**.
- **Na hora da compra:** o que já foi pego desce para o fim e as categorias resolvidas vão para baixo. No botão **R$** de cada item: anotar quanto deu ou marcar **não tinha**. O total aparece no topo; toque nele para definir um **orçamento**. A tela não apaga enquanto houver itens para pegar. **Começar nova compra** zera marcas e preços.
- **Complemento:** quem ficou em casa toca em **Enviar → Mandar só o que é novo** (ou **Como complemento**). Quem já saiu com a lista abre o link e põe os itens direto na lista dela: entram com o selo **novo** no topo da categoria, o que já foi pego continua marcado, e item já pego que foi pedido de novo volta com "pediram mais". As cópias da mesma lista ficam ligadas pelo link; sem ligação, o app sugere a lista que está em compra. O texto "➕ Mais N itens para…" colado no Importar também funciona.
- **Retorno da compra:** quem comprou toca em **Enviar → Enviar retorno** (ou no botão do fim da compra). Quem montou abre o link e vê o que foi comprado, o que não tinha, o que ficou e o total, e pode **fazer a próxima lista com o que faltou**.
- **Várias listas:** toque no nome da lista no topo para trocar, criar (Mercado, Farmácia, Casa, Festa ou Outros), renomear ou apagar. O link leva o nome e o tipo; quem recebe pode abrir como lista nova, juntar ou substituir.
- **Compras anteriores:** cada compra concluída (e cada retorno recebido) fica registrada com o que foi pego, o que faltou e o total, com o gasto do mês. Dá para repetir uma compra ou pôr o que faltou na lista.
- **Backup:** salva tudo num arquivo .json (compartilhável no celular) e restaura em outro aparelho.
- **Enviar:** link com a lista dentro (WhatsApp, Telegram…), QR code ou texto.
- **Importar:** cola um link, o texto do app ou uma lista simples. Com o app instalado no Android, dá para **compartilhar** uma mensagem direto com o app "NaLista".
- **Instalar:** no Android, o Chrome oferece "Instalar". No iPhone, Safari → Compartilhar → Adicionar à Tela de Início.

A lista fica só no aparelho. O link leva a lista depois do `#`, parte do endereço que não vai para o servidor.

## Desenvolvimento

```bash
npm install
npm run dev      # servidor local (também acessível na rede, para testar no celular)
npm test         # verificações do núcleo (leitor de texto e fala, link, catálogo, histórico)
npm run build    # gera dist/ e fecha o service worker
```

Cada `git push` no `main` roda os testes e publica no GitHub Pages (`.github/workflows/publicar.yml`).
Para ativar uma vez: Settings → Pages → Source: **GitHub Actions**.

Ícones PNG e a imagem de prévia do link (`public/og.png`): `node tools/gen-icons.mjs` (usa o Playwright instalado na máquina).
