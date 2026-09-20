import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-zinc-800/60 rounded ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-2.5 w-full mt-1" />
      <Skeleton className="h-2.5 w-4/5" />
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50 mt-1">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="p-3.5 flex items-center justify-between gap-4 border-b border-zinc-800/60">
      <div className="flex items-center gap-3 flex-1">
        <Skeleton className="w-7 h-7 rounded shrink-0" />
        <div className="space-y-1.5 flex-1 max-w-sm">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2 w-1/2" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-7 w-7 rounded" />
        <Skeleton className="h-7 w-7 rounded" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
      <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex items-center gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="w-6 h-6 rounded-md" />
      </div>
      <Skeleton className="h-6 w-20 mt-1" />
      <Skeleton className="h-2.5 w-16" />
    </div>
  );
}
