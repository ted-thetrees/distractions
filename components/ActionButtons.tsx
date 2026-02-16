'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ActionType = 'DI' | 'TA' | 'IA' | 'PR' | 'MI' | 'TS' | 'TB' | 'DV' | 'DL';

interface ActionButtonsProps {
  rowId: string;
  onAction: (rowId: string, action: ActionType) => Promise<void>;
}

const actions: { type: ActionType; label: string; colors: string }[] = [
  { type: 'DI', label: 'Distractions', colors: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200' },
  { type: 'TA', label: 'Talent', colors: 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200' },
  { type: 'IA', label: 'Inspiring Assets', colors: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200' },
  { type: 'PR', label: 'Project Item', colors: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' },
  { type: 'MI', label: 'Meaty Ideas', colors: 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200' },
  { type: 'TS', label: 'Tech Stack', colors: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border-cyan-200' },
  { type: 'TB', label: 'To Buy', colors: 'bg-pink-100 text-pink-800 hover:bg-pink-200 border-pink-200' },
  { type: 'DV', label: 'Do/Visit', colors: 'bg-teal-100 text-teal-800 hover:bg-teal-200 border-teal-200' },
  { type: 'DL', label: 'Delete', colors: 'bg-gray-800 text-white hover:bg-gray-700 border-gray-800' },
];

export default function ActionButtons({ rowId, onAction }: ActionButtonsProps) {
  const [loadingAction, setLoadingAction] = useState<ActionType | null>(null);

  const handleClick = async (action: ActionType, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loadingAction) return;

    setLoadingAction(action);
    try {
      await onAction(rowId, action);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-3">
      {actions.map(({ type, label, colors }) => (
        <Badge
          key={type}
          className={cn(
            colors,
            'text-[11px] py-0.5 px-2',
            loadingAction === type && 'opacity-50 cursor-wait',
            loadingAction && loadingAction !== type && 'opacity-70'
          )}
          onClick={(e) => handleClick(type, e)}
        >
          {loadingAction === type ? '...' : label}
        </Badge>
      ))}
    </div>
  );
}
