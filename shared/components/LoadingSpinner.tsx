export function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center py-8 ${className}`}
      role="status"
      aria-label="Cargando"
    >
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
