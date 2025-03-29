import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { FileBarChart, Clock, CreditCard, UserPlus, ChevronRight } from "lucide-react";
import { ReactNode } from "react";

interface ActionItem {
  title: string;
  icon: ReactNode;
  handler: () => void;
  isPrimary?: boolean;
}

interface QuickActionsProps {
  actions: ActionItem[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <Card className="bg-white dark:bg-gray-800 rounded-xl">
      <CardContent className="p-4">
        <div className="space-y-3 flex gap-x-2 items-center">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.handler}
              className={`!mt-0 w-full flex items-center justify-between p-3 rounded-lg 
                ${action.isPrimary 
                  ? "bg-primary/10 text-primary hover:bg-primary hover:text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-secondary hover:text-white"
                } transition-colors`}
            >
              <span className="flex items-center">
                <span className="mr-2">{action.icon}</span>
                <span>{action.title}</span>
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function useQuickActions() {
  const navigate = useNavigate();
  
  const defaultActions: ActionItem[] = [
    {
      title: "Generate Payroll Report",
      icon: <FileBarChart className="h-5 w-5" />,
      handler: () => navigate("/payroll"),
      isPrimary: true
    },
    {
      title: "Process Bulk Attendance",
      icon: <Clock className="h-5 w-5" />,
      handler: () => navigate("/attendance")
    },
    {
      title: "Review EWA Requests",
      icon: <CreditCard className="h-5 w-5" />,
      handler: () => navigate("/ewa")
    },
    {
      title: "Add New Employee",
      icon: <UserPlus className="h-5 w-5" />,
      handler: () => navigate("/employees/new")
    }
  ];
  
  return { defaultActions };
}
