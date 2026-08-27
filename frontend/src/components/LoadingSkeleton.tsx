interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

/** Skeleton baris tabel saat fetch data. */
export default function LoadingSkeleton({ rows = 10, className = "" }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`} aria-label="Memuat data" role="status">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-4">
          <div className="h-3.5 w-8 bg-ice rounded" />
          <div className="h-3.5 flex-1 bg-ice rounded" />
          <div className="h-3.5 w-24 bg-ice rounded" />
          <div className="h-3.5 w-16 bg-ice rounded" />
        </div>
      ))}
    </div>
  );
}

/** Blok skeleton persegi (chart / panel). */
export function BlockSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="animate-pulse bg-ice rounded-lg w-full"
      style={{ height }}
      aria-label="Memuat data"
      role="status"
    />
  );
}
