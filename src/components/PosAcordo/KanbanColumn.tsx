import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  children: React.ReactNode;
}

export function KanbanColumn({ id, title, color, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border p-3 min-h-[400px] transition-colors',
        color,
        isOver && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      <div className="flex items-center justify-between mb-3 pb-2 border-b">
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-xs bg-background px-2 py-0.5 rounded-full font-medium">
          {count}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[600px]">
        {children}
      </div>
    </div>
  );
}
