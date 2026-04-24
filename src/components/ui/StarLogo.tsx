type StarLogoProps = {
  size?: number;
  className?: string;
};

export function StarLogo({ size = 28, className = "" }: StarLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-label="GOES"
    >
      <defs>
        <linearGradient id="starGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--logo-a)" />
          <stop offset="100%" stopColor="var(--logo-b)" />
        </linearGradient>
      </defs>
      <polygon
        fill="url(#starGrad)"
        points="50,4 61,38 97,38 68,59 79,94 50,72 21,94 32,59 3,38 39,38"
      />
    </svg>
  );
}

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-[3px]">
      <StarLogo size={size} />
      <span
        className="text-[26px] leading-none text-foreground"
        style={{
          fontFamily: '"Arial Black", Arial, Impact, "Helvetica Neue", sans-serif',
          fontWeight: 900,
          letterSpacing: "-0.04em",
        }}
      >
        GOES
      </span>
    </div>
  );
}
