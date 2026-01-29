// MJOLNIR stars (static) + "system status" flavor.
// (Removed the falling/scrolling star animation.)
(() => {
  const canvas = document.getElementById('stars');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  let w = 0, h = 0;
  let stars = [];
  const STAR_COUNT = 170;

  function seedStar() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      z: 0.2 + Math.random() * 0.9,
      s: 0.6 + Math.random() * 1.8,
      c: Math.random() < 0.22 ? 'cyan' : (Math.random() < 0.15 ? 'green' : 'white')
    };
  }

  function color(c, a) {
    if (c === 'cyan') return `rgba(102,217,255,${a})`;
    if (c === 'green') return `rgba(69,255,154,${a})`;
    return `rgba(231,242,255,${a})`;
  }

  function resize() {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) stars.push(seedStar());

    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // faint vignette
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.35, 50, w * 0.5, h * 0.35, Math.max(w, h) * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let s of stars) {
      const alpha = 0.16 + s.z * 0.38;
      ctx.beginPath();
      ctx.fillStyle = color(s.c, alpha);
      ctx.arc(s.x, s.y, s.s * s.z, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
})();

// Live clock/status (optional)
(() => {
  const el = document.querySelector('[data-clock]');
  if (!el) return;
  const fmt = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const update = () => el.textContent = fmt.format(new Date());
  update();
  setInterval(update, 1000);
})();
