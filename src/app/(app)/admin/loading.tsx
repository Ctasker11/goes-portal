export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-60 rounded bg-[color:var(--surface-track)]" />
      <div className="h-16 rounded-2xl bg-[color:var(--input-bg)]" />
      <div className="rounded-2xl bg-[color:var(--input-bg)]">
        <div className="h-10 border-b border-border" />
        <div className="h-14" />
        <div className="h-14 border-t border-border" />
        <div className="h-14 border-t border-border" />
      </div>
    </div>
  );
}
