'use client';

import { useId, useState, type ReactNode } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useReducedMotion } from 'motion/react';
import { GripVertical } from 'lucide-react';
import type { Material } from '@namarca/editor/campaigns';

export function SortableMaterialLibrary({ items, disabled, onMove, renderMaterial, children }: {
  items: Material[]; disabled: boolean; onMove: (from: number, to: number) => void;
  renderMaterial: (item: Material) => ReactNode; children: ReactNode;
}) {
  const contextId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const active = items.find(item => item.id === activeId);
  const finish = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!disabled && over && active.id !== over.id) onMove(items.findIndex(item => item.id === active.id), items.findIndex(item => item.id === over.id));
  };
  const position = (id: string | number) => items.findIndex(item => item.id === id) + 1;
  return <DndContext id={contextId} sensors={sensors} collisionDetection={closestCenter}
    onDragStart={({ active }) => { if (!disabled) setActiveId(String(active.id)); }}
    onDragCancel={() => setActiveId(null)} onDragEnd={finish}
    accessibility={{ screenReaderInstructions: { draggable: 'Para reordenar, pressione Espaço. Use as setas para escolher a posição e Espaço para soltar. Escape cancela. Salve para gravar a ordem.' }, announcements: {
      onDragStart: ({ active }) => `Material na posição ${position(active.id)} selecionado para mover.`,
      onDragOver: ({ over }) => over ? `Destino: posição ${position(over.id)} de ${items.length}.` : 'Fora da biblioteca.',
      onDragEnd: ({ active, over }) => !over ? 'Reordenação cancelada.' : active.id === over.id ? 'Material mantido na posição original.' : `Material solto na posição ${position(over.id)}. Alteração não salva.`,
      onDragCancel: () => 'Reordenação cancelada.',
    } }}>
    <SortableContext items={items.map(item => item.id)} strategy={rectSortingStrategy}>{children}</SortableContext>
    <DragOverlay dropAnimation={reduced ? null : { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
      {active && <div className="ws-studio-asset ws-studio-drag-overlay" aria-hidden="true" inert>
        <button type="button" className="ws-studio-drag-handle" tabIndex={-1}><GripVertical aria-hidden="true" /></button>
        {renderMaterial(active)}
      </div>}
    </DragOverlay>
  </DndContext>;
}

export function SortableMaterial({ id, name, count, disabled, selected, children }: {
  id: string; name: string; count: number; disabled: boolean;
  selected: boolean; children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id, disabled: disabled || count < 2, transition: reduced ? null : { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' },
  });
  return <li ref={setNodeRef} className="ws-studio-asset" data-material-id={id} data-selected={selected} data-dragging={isDragging}
    style={{ transform: CSS.Transform.toString(transform), transition: reduced ? undefined : transition }}>
    <button ref={setActivatorNodeRef} type="button" className="ws-studio-drag-handle" disabled={disabled || count < 2}
      {...attributes} {...listeners} aria-label={`Reordenar ${name}`} title="Arraste para reordenar"><GripVertical aria-hidden="true" /></button>
    {children}
  </li>;
}
