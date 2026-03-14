import { useEffect, useRef } from "react";

type AuroraProps = {
  colorStops?: [string, string, string];
  amplitude?: number;
  blend?: number;
  className?: string;
  style?: React.CSSProperties;
};

export function Aurora({
  colorStops = ["#5227FF", "#7cff67", "#5227FF"],
  amplitude = 1,
  blend = 0.5,
  className = "",
  style = {},
}: AuroraProps) {
  return (
    <div
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
        @keyframes aurora-wave-1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: ${blend}; }
          25% { transform: translate(10%, -5%) scale(1.1); opacity: ${blend * 0.8}; }
          50% { transform: translate(-5%, 10%) scale(0.95); opacity: ${blend}; }
          75% { transform: translate(-10%, -10%) scale(1.05); opacity: ${blend * 0.9}; }
        }
        @keyframes aurora-wave-2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: ${blend * 0.8}; }
          33% { transform: translate(-8%, 8%) scale(1.15); opacity: ${blend}; }
          66% { transform: translate(12%, 5%) scale(0.9); opacity: ${blend * 0.7}; }
        }
        @keyframes aurora-wave-3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: ${blend * 0.6}; }
          50% { transform: translate(5%, -12%) rotate(180deg); opacity: ${blend}; }
        }
      `}</style>
      <div
        style={{
          position: "absolute",
          inset: `${-50 * amplitude}%`,
          background: `radial-gradient(ellipse 80% 50% at 30% 40%, ${colorStops[0]} 0%, transparent 50%),
            radial-gradient(ellipse 60% 80% at 70% 60%, ${colorStops[1]} 0%, transparent 50%),
            radial-gradient(ellipse 70% 60% at 50% 80%, ${colorStops[2]} 0%, transparent 50%)`,
          mixBlendMode: "screen",
          animation: "aurora-wave-1 15s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: `${-40 * amplitude}%`,
          background: `radial-gradient(ellipse 70% 60% at 60% 30%, ${colorStops[2]} 0%, transparent 45%),
            radial-gradient(ellipse 50% 70% at 40% 70%, ${colorStops[0]} 0%, transparent 45%)`,
          mixBlendMode: "screen",
          animation: "aurora-wave-2 18s ease-in-out infinite 2s",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: `${-30 * amplitude}%`,
          background: `radial-gradient(ellipse 90% 40% at 50% 50%, ${colorStops[1]} 0%, transparent 55%)`,
          mixBlendMode: "screen",
          animation: "aurora-wave-3 20s ease-in-out infinite 1s",
        }}
      />
    </div>
  );
}
