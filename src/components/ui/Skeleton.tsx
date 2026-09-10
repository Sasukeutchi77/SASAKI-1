import React from 'react';

export interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-[#141933] border border-cyan-500/20 rounded-md ${className}`}
      aria-hidden="true"
    />
  );
};

export const ArticleCardSkeleton: React.FC<{
  variant?: 'standard' | 'compact' | 'featured' | 'horizontal';
  count?: number;
}> = ({ variant = 'standard', count = 1 }) => {
  const items = Array.from({ length: Math.max(1, count) });

  return (
    <>
      {items.map((_, index) => {
        if (variant === 'compact') {
          return (
            <div key={index} className="p-3 bg-[#101428] rounded-xl border border-cyan-500/30 flex gap-3 animate-pulse shadow-[0_0_15px_rgba(0,243,255,0.05)]">
              <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg shrink-0" />
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Skeleton className="w-4 h-4 rounded-full" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            </div>
          );
        }

        if (variant === 'featured') {
          return (
            <div key={index} className="rounded-2xl border border-cyan-500/40 bg-[#101428] overflow-hidden animate-pulse shadow-[0_0_20px_rgba(0,243,255,0.1)]">
              <Skeleton className="aspect-[16/9] sm:aspect-[21/9] w-full" />
              <div className="p-5 sm:p-6 space-y-3">
                <Skeleton className="h-4 w-28 rounded-full" />
                <Skeleton className="h-6 sm:h-8 w-11/12" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          );
        }

        // Standard 2-column or grid card skeleton
        return (
          <div key={index} className="bg-[#101428] rounded-2xl border border-cyan-500/30 overflow-hidden flex flex-col animate-pulse shadow-[0_0_15px_rgba(0,243,255,0.05)]">
            <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="aspect-[16/9] w-full" />
            <div className="p-3.5 sm:p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-11/12" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-4/5" />
              </div>
              <div className="pt-3 border-t border-cyan-500/20 flex items-center justify-between">
                <div className="flex gap-3">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="w-6 h-6 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

export const ArticleDetailSkeleton: React.FC = () => {
  return (
    <div className="p-4 sm:p-8 space-y-6 animate-pulse max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-8 sm:h-12 w-11/12" />
      <div className="p-4 rounded-xl bg-[#101428] border border-cyan-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
      <div className="space-y-3 pt-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
};

export const CommentsSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 p-3 bg-[#101428] border border-cyan-500/20 rounded-xl">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
};
