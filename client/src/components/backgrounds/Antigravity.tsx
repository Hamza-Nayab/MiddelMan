import { useEffect, useRef } from "react";

type AntigravityProps = {
  count?: number;
  color?: string;
  particleSize?: number;
  className?: string;
  style?: React.CSSProperties;
};

export function Antigravity({
  count = 300,
  color = "#FF9FFC",
  particleSize = 2,
  className = "",
  style = {},
}: AntigravityProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      baseX: number;
      baseY: number;
    }> = [];

    let animationId: number;

    const init = () => {
      particles.length = 0;
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: 0,
          vy: 0,
          baseX: Math.random() * w,
          baseY: Math.random() * h,
        });
      }
    };

    const animate = () => {
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const time = Date.now() * 0.001;

      particles.forEach((p) => {
        const dx = cx - p.x;
        const dy = cy - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const force = Math.sin(time * 2 + dist * 0.01) * 0.5 + 0.5;
        p.vx += (dx / dist) * force * 0.1;
        p.vy += (dy / dist) * force * 0.1;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.x += p.vx;
        p.y += p.vy;
        p.x = (p.x + w) % w;
        p.y = (p.y + h) % h;

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6 + Math.sin(time + p.x * 0.01) * 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, particleSize, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      animationId = requestAnimationFrame(animate);
    };

    resize();
    init();
    animate();

    const onResize = () => {
      resize();
      init();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
    };
  }, [count, color, particleSize]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}
