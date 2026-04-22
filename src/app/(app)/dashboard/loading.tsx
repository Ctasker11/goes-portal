export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-28 rounded-xl bg-white shadow-sm" />
      <div className="h-20 rounded-xl bg-white shadow-sm" />
      <div className="space-y-3">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-16 rounded-lg bg-white shadow-sm" />
        <div className="h-16 rounded-lg bg-white shadow-sm" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="h-16 rounded-lg bg-white shadow-sm" />
      </div>
    </div>
  );
}
