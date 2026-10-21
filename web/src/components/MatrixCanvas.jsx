import { useEffect, useRef } from 'react';

/**
 * Green "digital rain" canvas.
 * Purely decorative — it renders a background effect while the session
 * handshake log plays. No network access, no user data.
 */
export default function MatrixCanvas({ className = '', intensity = 1 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');

    const glyphs = 'アカサタナハマヤラワｶｷｸｹｺ0123456789ABCDEF<>[]{}/\\|=+*#$%'.split('');
    const fontSize = 15;
    let columns = 0;
    let drops = [];
    let raf = 0;
    let last = 0;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { clientWidth: w, clientHeight: h } = canvas.parentElement ?? document.body;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      columns = Math.ceil(w / fontSize);
      drops = Array.from({ length: columns }, () =>
        Math.floor((Math.random() * h) / fontSize),
      );
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
    }

    function draw(now) {
      // ~22 fps keeps it cinematic without hammering the GPU.
      if (now - last < 45) {
        raf = requestAnimationFrame(draw);
        return;
      }
      last = now;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      ctx.fillStyle = 'rgba(0,0,0,0.10)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${fontSize}px ui-monospace, JetBrains Mono, Menlo, monospace`;

      for (let i = 0; i < columns; i += 1) {
        const char = glyphs[Math.floor(Math.random() * glyphs.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillStyle = 'rgba(190,255,215,0.95)';
        ctx.fillText(char, x, y);

        ctx.fillStyle = 'rgba(56,255,138,0.55)';
        ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], x, y - fontSize);

        if (y > h && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 1;
      }

      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);

    if (!reduced) {
      raf = requestAnimationFrame(draw);
    } else {
      // Static frame for users who prefer reduced motion.
      ctx.fillStyle = 'rgba(56,255,138,0.5)';
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < columns; i += 1) {
        for (let j = 0; j < 20; j += 1) {
          ctx.fillText(glyphs[(i * j) % glyphs.length], i * fontSize, j * fontSize);
        }
      }
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [intensity]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
