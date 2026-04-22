type LogoProps = {
  variant?: "full" | "star";
  className?: string;
};

export function Logo({ variant = "full", className = "" }: LogoProps) {
  if (variant === "star") {
    return (
      <svg
        viewBox="0 0 100 100"
        className={className}
        fill="currentColor"
        aria-label="GOES"
      >
        <polygon points="50,5 61,38 96,38 68,59 78,93 50,72 22,93 32,59 4,38 39,38" />
      </svg>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg viewBox="0 0 100 100" className="h-8 w-8 text-red-brand">
        <polygon
          fill="currentColor"
          points="50,5 61,38 96,38 68,59 78,93 50,72 22,93 32,59 4,38 39,38"
        />
      </svg>
      <span className="text-2xl font-extrabold tracking-tight text-navy">
        GOES
      </span>
    </div>
  );
}
