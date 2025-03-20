import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";

interface ActionItem {
  title: string;
  icon: string;
  handler: () => void;
  isPrimary?: boolean;
}

interface QuickActionsProps {
  actions: ActionItem[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-glass dark:shadow-glass-dark">
      <CardContent className="p-4">
        <div className="space-y-3">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.handler}
              className={`w-full flex items-center justify-between p-3 rounded-lg 
                ${action.isPrimary 
                  ? "bg-primary/10 text-primary hover:bg-primary hover:text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-secondary hover:text-white"
                } transition-colors`}
            >
              <span className="flex items-center">
                <i className={`ri-${action.icon} text-xl mr-2`}></i>
                <span>{action.title}</span>
              </span>
              <i className="ri-arrow-right-line"></i>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function useQuickActions() {
  const [, setLocation] = useLocation();
  
  const defaultActions: ActionItem[] = [
    {
      title: "Generate Payroll Report",
      icon: "file-chart-line",
      handler: () => setLocation("/payroll"),
      isPrimary: true
    },
    {
      title: "Process Bulk Attendance",
      icon: "time-line",
      handler: () => setLocation("/attendance")
    },
    {
      title: "Review EWA Requests",
      icon: "bank-card-line",
      handler: () => setLocation("/ewa")
    },
    {
      title: "Add New Employee",
      icon: "user-add-line",
      handler: () => setLocation("/employees/new")
    }
  ];
  
  return { defaultActions };
}
