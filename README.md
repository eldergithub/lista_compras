# Lista de Compras

App de lista de compras para o celular (PWA): monte a lista, envie por link para quem vai comprar e marque os itens no mercado — mesmo sem internet.

**Abrir:** https://eldergithub.github.io/lista_compras/

## Como usar

- **Editar → caixa de adicionar:** escreva ou fale vários itens de uma vez — `2 kg frango, pão, 6 leite e tomate`, `dois quilos de carne`, `meia dúzia de ovos`. A prévia mostra quantidade, unidade e categoria antes de entrar. Pelo microfone do teclado (Gboard) funciona igual.
- **Sugestões:** completa o nome com o que você já comprou e um catálogo de ~280 itens, cada um com a unidade de costume (banana em dz, carne em kg, leite em cx).
- **Itens de sempre** e **Repetir a última compra**, a partir do histórico guardado no aparelho.
- **Detalhes do item:** toque no nome para mudar nome, observação (`maduras`, `marca X`), categoria e quantidade.
- Item repetido soma a quantidade; remover, apagar e importar têm **Desfazer**.
- **Enviar:** link com a lista dentro (WhatsApp, Telegram…), QR code ou texto.
- **Importar:** cola um link, o texto do app ou uma lista simples. Com o app instalado no Android, dá para **compartilhar** uma mensagem direto com o app "Compras".
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

Ícones PNG: `node tools/gen-icons.mjs` (usa o Playwright instalado na máquina).
