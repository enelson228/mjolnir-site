// Parent-side iframe auto-resizer for same-origin embedded modules.
(() => {
  const frame = document.querySelector('iframe[data-mjolnir-frame]');
  if (!frame) return;

  function setHeight(h){
    const min = 640;
    const max = 2200;
    const clamped = Math.max(min, Math.min(max, Number(h) || min));
    frame.style.height = clamped + 'px';
  }

  // Listen for child resize pings.
  window.addEventListener('message', (ev) => {
    if (ev.origin !== window.location.origin) return;
    const msg = ev.data;
    if (!msg || msg.type !== 'MJ_IFRAME_SIZE') return;
    if (msg.id && msg.id !== frame.id) return;
    setHeight(msg.height);
  });

  // Fallback: try to read same-origin height.
  const trySameOrigin = () => {
    try{
      const doc = frame.contentDocument;
      if (!doc) return;
      const h = Math.max(
        doc.documentElement?.scrollHeight || 0,
        doc.body?.scrollHeight || 0
      );
      if (h) setHeight(h);
    }catch{ /* ignore */ }
  };

  frame.addEventListener('load', () => {
    trySameOrigin();
    // give app a moment to render
    setTimeout(trySameOrigin, 250);
    setTimeout(trySameOrigin, 1000);
  });
})();
