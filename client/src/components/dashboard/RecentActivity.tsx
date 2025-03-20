import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface Activity {
  id: number;
  type: "employee" | "ewa" | "attendance" | "payroll" | "self-log";
  title: string;
  description: string;
  time: string;
  icon: string;
}

interface RecentActivityProps {
  filter?: string;
  limit?: number;
}

export function RecentActivity({ filter, limit = 5 }: RecentActivityProps) {
  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
  });
  
  const getIconColorClass = (type: string) => {
    switch (type) {
      case 'employee':
        return 'bg-primary/10 text-primary';
      case 'ewa':
        return 'bg-[#F59E0B]/10 text-[#F59E0B]';
      case 'attendance':
        return 'bg-[#EF4444]/10 text-[#EF4444]';
      case 'payroll':
        return 'bg-[#10B981]/10 text-[#10B981]';
      case 'self-log':
        return 'bg-[#3B82F6]/10 text-[#3B82F6]';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  const filteredActivities = activities
    ? filter
      ? activities.filter(activity => activity.type === filter)
      : activities
    : [];
    
  const displayActivities = filteredActivities.slice(0, limit);

  return (
    <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-glass dark:shadow-glass-dark h-full relative z-0">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Badge variant={!filter ? "default" : "outline"} className="rounded-full">All</Badge>
            <Badge variant={filter === 'employee' ? "default" : "outline"} className="rounded-full">Employees</Badge>
            <Badge variant={filter === 'attendance' ? "default" : "outline"} className="rounded-full">Attendance</Badge>
            <Badge variant={filter === 'ewa' ? "default" : "outline"} className="rounded-full">EWA</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3 pb-4 animate-pulse">
                <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full w-8 h-8"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-y-auto max-h-96 pr-2">
            {displayActivities.map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-start space-x-3 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:mb-0 last:pb-0"
              >
                <div className={`p-2 rounded-full ${getIconColorClass(activity.type)}`}>
                  <i className={`ri-${activity.icon}`}></i>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <p className="font-medium">{activity.title}</p>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{activity.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
