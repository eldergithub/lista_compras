/**
 * Tour guiado: escurece a tela, ilumina uma parte do app e explica o que ela
 * faz num balão, passo a passo (Voltar, Próximo, Pular). Passos sem alvo na
 * tela (lista vazia, por exemplo) são pulados; passo sem `alvo` é um balão no
 * meio da tela (boas-vindas e fim).
 *
 * Passo: { alvo?: () => Element | null, titulo, texto, antes?: () => void, gesto?: 'arrastar' }
 */

let atual = null;

export function tourAberto() { return !!atual; }

export function iniciarTour(passos, { aoTerminar } = {}) {
  if (atual) atual.fechar(false);
  const camada = document.createElement('div');
  camada.className = 'tour';
  camada.setAttribute('role', 'dialog');
  camada.setAttribute('aria-modal', 'true');
  camada.setAttribute('aria-label', 'Tour do app');
  camada.innerHTML = `<div class="tour-fundo"></div><div class="tour-luz" aria-hidden="true"></div>
    <div class="tour-balao" tabindex="-1">
      <div class="tour-topo"><span class="tour-passo"></span><button type="button" class="tour-pular">Pular tour</button></div>
      <h3 class="tour-titulo"></h3>
      <p class="tour-texto"></p>
      <div class="tour-pontos" aria-hidden="true"></div>
      <div class="tour-botoes"><button type="button" class="btn tour-voltar">Voltar</button><button type="button" class="btn primario tour-proximo">Próximo</button></div>
    </div>`;
  document.body.appendChild(camada);
  const luz = camada.querySelector('.tour-luz');
  const balao = camada.querySelector('.tour-balao');
  const q = (s) => camada.querySelector(s);

  // Só os passos que têm onde mostrar agora.
  const validos = passos.filter((p) => !p.alvo || p.alvo());
  let i = 0;
  let alvoAtual = null;

  // O voltar do aparelho fecha o tour (e não o app).
  history.pushState({ nalistaTour: true }, '');
  const aoVoltar = () => { if (atual) fechar(true, true); };
  addEventListener('popstate', aoVoltar);

  function posicionar() {
    const vw = innerWidth, vh = innerHeight;
    const largura = Math.min(340, vw - 24);
    balao.style.width = `${largura}px`;
    if (!alvoAtual) {
      luz.style.cssText = `left:${vw / 2}px;top:${vh / 2}px;width:0;height:0;`;
      balao.style.left = `${(vw - largura) / 2}px`;
      balao.style.top = `${Math.max(16, (vh - balao.offsetHeight) / 2)}px`;
      balao.dataset.lado = 'meio';
      return;
    }
    const r = alvoAtual.getBoundingClientRect();
    const folga = 6;
    luz.style.cssText = `left:${r.left - folga}px;top:${r.top - folga}px;width:${r.width + folga * 2}px;height:${r.height + folga * 2}px;`;
    const h = balao.offsetHeight;
    const embaixo = r.bottom + 14;
    const emCima = r.top - 14 - h;
    const cabeEmbaixo = embaixo + h < vh - 8;
    const top = cabeEmbaixo || emCima < 8 ? Math.min(embaixo, vh - h - 8) : emCima;
    balao.dataset.lado = cabeEmbaixo || emCima < 8 ? 'baixo' : 'cima';
    const centro = r.left + r.width / 2;
    const left = Math.min(Math.max(12, centro - largura / 2), vw - largura - 12);
    balao.style.left = `${left}px`;
    balao.style.top = `${Math.max(8, top)}px`;
    balao.style.setProperty('--seta', `${Math.min(Math.max(20, centro - left), largura - 20)}px`);
  }

  function mostrar(n) {
    document.querySelectorAll('.tour-gesto').forEach((e) => e.classList.remove('tour-gesto'));
    i = Math.max(0, Math.min(n, validos.length - 1));
    const p = validos[i];
    p.antes?.();
    alvoAtual = p.alvo ? p.alvo() : null;
    q('.tour-passo').textContent = `${i + 1} de ${validos.length}`;
    q('.tour-titulo').textContent = p.titulo;
    q('.tour-texto').innerHTML = p.texto;
    q('.tour-pontos').innerHTML = validos.map((_, k) => `<span class="${k === i ? 'atual' : ''}"></span>`).join('');
    q('.tour-voltar').hidden = i === 0;
    q('.tour-proximo').textContent = i === validos.length - 1 ? 'Começar a usar' : (i === 0 ? 'Vamos lá' : 'Próximo');
    q('.tour-pular').hidden = i === validos.length - 1;
    camada.classList.toggle('sem-alvo', !alvoAtual);
    if (alvoAtual) {
      alvoAtual.scrollIntoView({ block: 'center', behavior: 'instant' });
      if (p.gesto === 'arrastar') alvoAtual.closest('li')?.classList.add('tour-gesto');
    }
    // Espera a rolagem assentar antes de medir.
    requestAnimationFrame(() => { posicionar(); balao.focus({ preventScroll: true }); });
  }

  function fechar(terminou = true, veioDoVoltar = false) {
    if (!atual) return;
    atual = null;
    removeEventListener('popstate', aoVoltar);
    removeEventListener('resize', posicionar);
    removeEventListener('scroll', posicionar, true);
    removeEventListener('keydown', teclas);
    document.querySelectorAll('.tour-gesto').forEach((e) => e.classList.remove('tour-gesto'));
    camada.remove();
    if (!veioDoVoltar && history.state?.nalistaTour) history.back();
    aoTerminar?.(terminou);
  }

  function teclas(e) {
    if (e.key === 'Escape') fechar(false);
    else if (e.key === 'ArrowRight') q('.tour-proximo').click();
    else if (e.key === 'ArrowLeft' && i > 0) mostrar(i - 1);
  }

  q('.tour-proximo').onclick = () => (i === validos.length - 1 ? fechar(true) : mostrar(i + 1));
  q('.tour-voltar').onclick = () => mostrar(i - 1);
  q('.tour-pular').onclick = () => fechar(false);
  // Tocar fora do balão avança, como na maioria dos tours.
  q('.tour-fundo').onclick = () => q('.tour-proximo').click();
  addEventListener('resize', posicionar);
  addEventListener('scroll', posicionar, true);
  addEventListener('keydown', teclas);
  atual = { fechar };
  mostrar(0);
}
