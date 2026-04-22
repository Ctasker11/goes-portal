export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="h-24 rounded-xl bg-white shadow-sm" />
      <div className="space-y-3">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="h-20 rounded-lg bg-white shadow-sm" />
        <div className="h-20 rounded-lg bg-white shadow-sm" />
        <div className="h-20 rounded-lg bg-white shadow-sm" />
      </div>
    </div>
  );
}
