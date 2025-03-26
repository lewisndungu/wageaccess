
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChatAction } from '@/lib/chat-service';
import { 
  Upload, 
  Download, 
  Users, 
  UserPlus, 
  Calculator,
  HelpCircle
} from 'lucide-react';

interface ActionPillsProps {
  actions: ChatAction[];
  onActionClick: (action: ChatAction) => void;
}

const ActionPills: React.FC<ActionPillsProps> = ({ actions, onActionClick }) => {
  // Map of action IDs to icons
  const actionIcons: Record<string, React.ReactNode> = {
    'upload-employees': <Upload className="h-3 w-3 mr-1" />,
    'calculate-payroll': <Calculator className="h-3 w-3 mr-1" />,
    'view-employees': <Users className="h-3 w-3 mr-1" />,
    'create-employee': <UserPlus className="h-3 w-3 mr-1" />,
    'export-data': <Download className="h-3 w-3 mr-1" />,
  };
  
  if (!actions.length) return null;
  
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {actions.map(action => (
        <Button 
          key={action.id}
          size="sm"
          variant="outline"
          className="h-7 text-xs px-2 rounded-full bg-background"
          onClick={() => onActionClick(action)}
        >
          {actionIcons[action.id] || <HelpCircle className="h-3 w-3 mr-1" />}
          {action.label}
        </Button>
      ))}
    </div>
  );
};

export default ActionPills;
