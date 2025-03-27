import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ChatAction } from '@/lib/chat-service';

interface ActionPillsProps {
  actions: ChatAction[];
  onActionClick: (action: ChatAction) => void;
}

const ActionPills: React.FC<ActionPillsProps> = ({ actions, onActionClick }) => {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {actions.map((action) => (
        <Badge
          key={action.id}
          variant="outline"
          className="cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={() => onActionClick(action)}
        >
          {action.label}
        </Badge>
      ))}
    </div>
  );
};

export default ActionPills;
