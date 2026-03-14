import { useRef, useEffect, useState } from "react";

type IridescenceProps = {
  speed?: number;
  amplitude?: number;
  mouseReact?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function Iridescence({
  speed = 1,
  amplitude = 0.1,
  mouseReact = true,
  className = "",
  style = {},
}: IridescenceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (!mouseReact || !containerRef.current) return;
    const el = containerRef.current;
    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      });
    };
    el.addEventListener("mousemove", handler);
    return () => el.removeEventListener("mousemove", handler);
  }, [mouseReact]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: "none",
        ...style,
      }}
    >
      <style>{`
        @keyframes iridescence-shift {
          0%, 100% { filter: hue-rotate(0deg) saturate(1.2); }
          25% { filter: hue-rotate(30deg) saturate(1.3); }
          50% { filter: hue-rotate(60deg) saturate(1.15); }
          75% { filter: hue-rotate(90deg) saturate(1.25); }
        }
      `}</style>
      <div
        style={{
          position: "absolute",
          inset: "-20%",
          background: `linear-gradient(
            ${135 + (mousePos.x - 0.5) * 60}deg,
            hsl(${200 + mousePos.x * 60}, 80%, 60%) 0%,
            hsl(${280 + mousePos.y * 40}, 70%, 65%) 25%,
            hsl(${320 + mousePos.x * 40}, 75%, 55%) 50%,
            hsl(${260 + mousePos.y * 60}, 80%, 60%) 75%,
            hsl(${200 + mousePos.x * 60}, 80%, 60%) 100%
          )`,
          animation: `iridescence-shift ${12 / speed}s ease-in-out infinite`,
          transform: `scale(${1 + amplitude}) translate(${(mousePos.x - 0.5) * amplitude * 20}%, ${(mousePos.y - 0.5) * amplitude * 20}%)`,
          transition: "transform 0.3s ease-out",
        }}
      />
    </div>
  );
}
