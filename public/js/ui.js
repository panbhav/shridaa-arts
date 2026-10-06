(() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  function safeImage(value) {
    return typeof value === 'string' && /^\/?assets\/[a-zA-Z0-9_./-]+\.(jpg|jpeg|png|webp)$/.test(value) && !value.includes('..') ? value.replace(/^\//,'') : 'assets/artworks/swarna-mandala-mirror.webp';
  }
  function htmlArtwork(art) {
    const result = { ...art };
    for (const [key,value] of Object.entries(result)) if (typeof value === 'string') result[key] = escapeHtml(value);
    for (const key of ['image','fallbackImage']) if (art[key]) result[key] = escapeHtml(safeImage(art[key]));
    return result;
  }
  function storedArray(key) {
    try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? [...new Set(value.filter(v => typeof v === 'string'))] : []; } catch { return []; }
  }
  function store(key,value) { try { localStorage.setItem(key,JSON.stringify(value)); return true; } catch { return false; } }
  window.ShridaaUI = { escapeHtml, safeImage, htmlArtwork, storedArray, store };
  document.addEventListener('DOMContentLoaded', () => {
    const selectors = ['#mobileDrawer','#artworkModal','#lightboxModal','#wallVisualizerModal','#shortlistDrawer','#adminArtworkModal'];
    const layers = selectors.map(s => document.querySelector(s)).filter(Boolean);
    let current = null;
    const previousFocus = new WeakMap();
    const focusables = layer => [...layer.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')].filter(e => !e.disabled && e.tabIndex >= 0 && e.getClientRects().length);
    function sync() {
      const active = layers.filter(e => e.classList.contains('active') || e.style.display === 'flex');
      const top = active.sort((a,b) => Number(getComputedStyle(a).zIndex) - Number(getComputedStyle(b).zIndex)).at(-1) || null;
      for (const layer of layers) {
        const open = active.includes(layer);
        layer.inert = !open || layer !== top;
        layer.setAttribute('aria-hidden', String(!open || layer !== top));
        if (open) { layer.setAttribute('role','dialog'); layer.setAttribute('aria-modal','true'); }
      }
      // Inert only siblings of the active layer, preserving ancestors of nested dialogs.
      for (const child of document.body.children) {
        if (['SCRIPT','STYLE'].includes(child.tagName)) continue;
        if (['drawerBackdrop','shortlistBackdrop'].includes(child.id)) continue;
        if (layers.includes(child)) continue;
        child.inert = !!top && child !== top && !child.contains(top);
      }
      document.body.style.overflow = top ? 'hidden' : '';
      if (top !== current) {
        if (top) { previousFocus.set(top,document.activeElement); top.tabIndex = -1; (focusables(top)[0] || top).focus(); }
        else if (current) { const prev=previousFocus.get(current); if (prev?.isConnected && !prev.closest('[inert]')) prev.focus(); }
        current = top;
      }
    }
    const observer = new MutationObserver(sync);
    for (const layer of layers) observer.observe(layer,{attributes:true,attributeFilter:['class','style']});
    document.addEventListener('keydown', event => {
      if (event.key !== 'Tab' || !current) return;
      const items=focusables(current);
      if (!items.length) { event.preventDefault(); current.focus(); return; }
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    });
    sync();
  });
})();
