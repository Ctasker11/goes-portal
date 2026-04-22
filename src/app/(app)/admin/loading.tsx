export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-12 w-60 rounded bg-white" />
      <div className="h-16 rounded-xl bg-white shadow-sm" />
      <div className="rounded-xl bg-white shadow-sm">
        <div className="h-10 border-b border-border" />
        <div className="h-14" />
        <div className="h-14 border-t border-border" />
        <div className="h-14 border-t border-border" />
      </div>
    </div>
  );
}
