# Lista de Compras

App de lista de compras para o celular (PWA): monte a lista, envie por link para quem vai comprar e marque os itens no mercado — mesmo sem internet.

**Abrir:** https://eldergithub.github.io/lista_compras/

## Como usar

- **Editar:** quantidade com − e +, unidade (un, kg, g, L, cx, pct, dz), adicionar e remover itens. A categoria é sugerida pelo nome.
- **Enviar:** manda um link com a lista dentro (WhatsApp, Telegram…), mostra um QR code ou manda como texto.
- **Importar:** cola um link, o texto do app ou uma lista simples, um item por linha (`2 kg frango`, `Leite - 6 cx`).
- **Instalar:** no Android, o Chrome oferece "Instalar". No iPhone, Safari → Compartilhar → Adicionar à Tela de Início.

A lista fica só no aparelho. O link leva a lista depois do `#`, parte do endereço que não vai para o servidor.

## Desenvolvimento

```bash
npm install
npm run dev      # servidor local (também acessível na rede, para testar no celular)
npm test         # verificações do núcleo (texto, link, categorias)
npm run build    # gera dist/ e fecha o service worker
```

Cada `git push` no `main` roda os testes e publica no GitHub Pages (`.github/workflows/publicar.yml`).
Para ativar uma vez: Settings → Pages → Source: **GitHub Actions**.

Ícones PNG: `node tools/gen-icons.mjs` (usa o Playwright instalado na máquina).
