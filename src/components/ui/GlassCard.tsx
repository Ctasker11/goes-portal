"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  glow?: boolean;
  hover?: boolean;
  onClick?: () => void;
  as?: "div" | "section" | "article";
};

export function GlassCard({
  children,
  className = "",
  style,
  glow = false,
  hover = true,
  onClick,
  as: Tag = "div",
}: GlassCardProps) {
  const [isHover, setHover] = useState(false);

  const bg = isHover && hover ? "var(--surface-card-hover)" : "var(--surface-card)";
  const borderColor = glow ? "var(--border-active)" : "var(--border)";
  const shadow = glow ? "var(--card-shadow-glow)" : "var(--card-shadow)";

  return (
    <Tag
      className={`rounded-2xl ${className}`}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: bg,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${borderColor}`,
        boxShadow: shadow,
        transition: "background 300ms cubic-bezier(0.22,1,0.36,1), box-shadow 300ms cubic-bezier(0.22,1,0.36,1)",
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
