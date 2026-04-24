export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 w-32 rounded bg-[color:var(--surface-track)]" />
      <div className="h-24 rounded-2xl bg-[color:var(--input-bg)]" />
      <div className="space-y-3">
        <div className="h-3 w-48 rounded bg-[color:var(--surface-track)]" />
        <div className="h-20 rounded-2xl bg-[color:var(--input-bg)]" />
        <div className="h-20 rounded-2xl bg-[color:var(--input-bg)]" />
        <div className="h-20 rounded-2xl bg-[color:var(--input-bg)]" />
      </div>
    </div>
  );
}
