import { defineConfig } from 'vite';

export default defineConfig({
  // Caminhos relativos: funciona em usuario.github.io/lista_compras/ e em qualquer outra pasta.
  base: './',
  build: { target: 'es2020', outDir: 'dist', assetsDir: 'assets' },
  // host: true expõe o servidor na rede local, para testar no celular durante o desenvolvimento.
  server: { host: true, port: 5173 },
});
