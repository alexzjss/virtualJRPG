// ===== CENSURA TEMPORÁRIA: Hiruko =====
// Borra (blur) na tela tudo que mencionar Hiruko: texto, skills, vínculos, itens, inimigos, cartões.
// Para remover: apague este arquivo e as linhas <script src="/js/censura-hiruko.js"> em gm.html, player.html e table.html.
// Limite: a mandala (canvas) não é um elemento do DOM, então o ramo de Hiruko nela não é borrado.
(() => {
  const RE = /hiruko/i;
  const CLS = 'censura-hiruko';
  try {
    const st = document.createElement('style');
    st.id = 'censura-hiruko-css';
    // !important e seletor duplo: vence os filter de .unit, .unit.cur, .unit.ko, :hover etc. do style.css
    st.textContent = `.${CLS},.${CLS}.${CLS}{filter:blur(6px) !important;}`;
    document.head.appendChild(st);
  } catch (e) { /* sem head: nada a fazer */ }

  const mark = (el) => {
    if (!el || el.nodeType !== 1) return;
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    if (!el.classList.contains(CLS)) {
      for (const a of el.attributes) { if (RE.test(a.value)) { el.classList.add(CLS); break; } }
    }
  };

  const scan = (root) => {
    if (!root || root.nodeType !== 1 && root.nodeType !== 9) return;
    const elRoot = root.nodeType === 9 ? root.documentElement : root;
    mark(elRoot);
    elRoot.querySelectorAll('*').forEach(mark);
    const walker = document.createTreeWalker(elRoot, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (RE.test(n.nodeValue) && n.parentElement) n.parentElement.classList.add(CLS);
    }
  };

  let queued = new Set();
  let timer = 0;
  const flush = () => {
    timer = 0;
    const nodes = [...queued];
    queued = new Set();
    for (const node of nodes) {
      if (!node.isConnected) continue;
      if (node.nodeType === 3) { if (RE.test(node.nodeValue) && node.parentElement) node.parentElement.classList.add(CLS); }
      else scan(node);
    }
  };
  const later = (node) => {
    queued.add(node);
    if (!timer) timer = requestAnimationFrame(flush);
  };

  const start = () => {
    scan(document);
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'characterData') later(m.target.parentNode || m.target);
        else m.addedNodes.forEach((n) => later(n));
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
