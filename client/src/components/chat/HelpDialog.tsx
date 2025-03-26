
import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { chatService, ChatAction } from '@/lib/chat-service';
import { 
  User, 
  Upload, 
  FileSpreadsheet, 
  Calculator, 
  Download, 
  DollarSign, 
  UserPlus, 
  Users,
  Calendar,
  FileText,
  Settings,
  HelpCircle,
  Search,
  MessageSquare
} from 'lucide-react';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Map action ids to icons
const actionIcons: Record<string, React.ReactNode> = {
  'upload-employees': <Upload className="h-4 w-4 mr-2" />,
  'calculate-payroll': <Calculator className="h-4 w-4 mr-2" />,
  'view-employees': <Users className="h-4 w-4 mr-2" />,
  'create-employee': <UserPlus className="h-4 w-4 mr-2" />,
  'export-data': <Download className="h-4 w-4 mr-2" />,
};

const HelpDialog: React.FC<HelpDialogProps> = ({ open, onOpenChange }) => {
  const [suggestedActions, setSuggestedActions] = useState<ChatAction[]>([]);
  
  useEffect(() => {
    if (open) {
      // Get personalized suggestions based on user history
      const history = chatService.getHistory();
      const actions = chatService.getSuggestedActions(history);
      setSuggestedActions(actions);
    }
  }, [open]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>How can I help you?</DialogTitle>
          <DialogDescription>
            Here are some things you can do with the HR Assistant.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <h3 className="text-sm font-medium">Suggested for you</h3>
          <div className="grid grid-cols-1 gap-2">
            {suggestedActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                className="justify-start text-left"
                onClick={() => {
                  action.action();
                  onOpenChange(false);
                }}
              >
                {actionIcons[action.id] || <HelpCircle className="h-4 w-4 mr-2" />}
                {action.label}
              </Button>
            ))}
          </div>
          
          <h3 className="text-sm font-medium mt-4">Common chat commands</h3>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-start gap-2 p-2 rounded-md border">
              <Search className="h-4 w-4 mt-0.5" />
              <div>
                <span className="font-medium block">Find employee John</span>
                <span className="text-muted-foreground">Search for employees by name or ID</span>
              </div>
            </div>
            
            <div className="flex items-start gap-2 p-2 rounded-md border">
              <UserPlus className="h-4 w-4 mt-0.5" />
              <div>
                <span className="font-medium block">Update John's position to Manager</span>
                <span className="text-muted-foreground">Update employee information</span>
              </div>
            </div>
            
            <div className="flex items-start gap-2 p-2 rounded-md border">
              <Calculator className="h-4 w-4 mt-0.5" />
              <div>
                <span className="font-medium block">Calculate payroll for all employees</span>
                <span className="text-muted-foreground">Generate and export payroll reports</span>
              </div>
            </div>
            
            <div className="flex items-start gap-2 p-2 rounded-md border">
              <Upload className="h-4 w-4 mt-0.5" />
              <div>
                <span className="font-medium block">Upload employee data</span>
                <span className="text-muted-foreground">Import employees from spreadsheet</span>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HelpDialog;
