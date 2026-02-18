import React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ControleZapsign } from '@/hooks/useControleZapsign';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

export type StatusType = 'assinado' | 'nao_assinado' | 'pendente';

interface KanbanBoardProps {
  registros: ControleZapsign[];
  onStatusChange: (id: number, newStatus: StatusType) => void;
  onNameClick: (nome: string) => void;
  onCredorClick: (credor: string) => void;
}

const getStatusFromRegistro = (registro: ControleZapsign): StatusType => {
  if (registro.assinado_zapsign === true) return 'assinado';
  if (registro.assinado_zapsign === false) return 'nao_assinado';
  return 'pendente';
};

export function KanbanBoard({ 
  registros, 
  onStatusChange,
  onNameClick,
  onCredorClick 
}: KanbanBoardProps) {
  const [activeId, setActiveId] = React.useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columns: { id: StatusType; title: string; color: string }[] = [
    { id: 'pendente', title: 'Pendente', color: 'bg-secondary' },
    { id: 'nao_assinado', title: 'Não Assinado', color: 'bg-destructive/10' },
    { id: 'assinado', title: 'Assinado', color: 'bg-green-500/10' },
  ];

  const groupedRegistros = React.useMemo(() => {
    const groups: Record<StatusType, ControleZapsign[]> = {
      assinado: [],
      nao_assinado: [],
      pendente: [],
    };

    registros.forEach((registro) => {
      const status = getStatusFromRegistro(registro);
      groups[status].push(registro);
    });

    return groups;
  }, [registros]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeRegistro = registros.find((r) => r.id === active.id);
    if (!activeRegistro) return;

    const overId = over.id as string;
    
    // Check if dropped on a column
    if (['assinado', 'nao_assinado', 'pendente'].includes(overId)) {
      const newStatus = overId as StatusType;
      const currentStatus = getStatusFromRegistro(activeRegistro);
      
      if (currentStatus !== newStatus) {
        onStatusChange(activeRegistro.id, newStatus);
      }
    } else {
      // Dropped on another card - find which column it belongs to
      const overRegistro = registros.find((r) => r.id === over.id);
      if (overRegistro) {
        const newStatus = getStatusFromRegistro(overRegistro);
        const currentStatus = getStatusFromRegistro(activeRegistro);
        
        if (currentStatus !== newStatus) {
          onStatusChange(activeRegistro.id, newStatus);
        }
      }
    }
  };

  const activeRegistro = activeId 
    ? registros.find((r) => r.id === activeId) 
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            count={groupedRegistros[column.id].length}
          >
            <SortableContext
              items={groupedRegistros[column.id].map((r) => r.id)}
              strategy={verticalListSortingStrategy}
            >
              {groupedRegistros[column.id].map((registro) => (
                <KanbanCard
                  key={registro.id}
                  registro={registro}
                  onNameClick={onNameClick}
                  onCredorClick={onCredorClick}
                />
              ))}
            </SortableContext>
          </KanbanColumn>
        ))}
      </div>

      <DragOverlay>
        {activeRegistro ? (
          <KanbanCard
            registro={activeRegistro}
            onNameClick={onNameClick}
            onCredorClick={onCredorClick}
            isDragOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
