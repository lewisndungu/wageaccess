import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Users, Clock, Banknote, CreditCard } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  iconName: string;
  isPositiveChange?: boolean;
  additionalInfo?: React.ReactNode;
  colorClass?: string;
}

export function MetricCard({
  title,
  value,
  change,
  iconName,
  isPositiveChange = true,
  additionalInfo,
  colorClass = "text-primary"
}: MetricCardProps) {
  const changeColorClass = isPositiveChange ? "text-emerald-500" : "text-rose-500";
  
  // Map icon name to Lucide icon
  const getIcon = () => {
    switch (iconName) {
      case "team-line":
        return <Users className={`w-5 h-5 ${colorClass}`} />;
      case "time-line":
        return <Clock className={`w-5 h-5 ${colorClass}`} />;
      case "money-dollar-box-line":
        return <Banknote className={`w-5 h-5 ${colorClass}`} />;
      case "bank-card-line":
        return <CreditCard className={`w-5 h-5 ${colorClass}`} />;
      default:
        return <Users className={`w-5 h-5 ${colorClass}`} />;
    }
  };
  
  return (
    <Card className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-full">
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <div className="flex items-end mt-2">
            <p className="text-2xl font-bold">{value}</p>
            <div className={`flex items-center text-sm ml-3 ${changeColorClass}`}>
              {isPositiveChange ? 
                <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> : 
                <ArrowDownRight className="w-3.5 h-3.5 mr-1" />
              }
              <span>{change}</span>
            </div>
          </div>
        </div>
        <div className={`flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10`}>
          {getIcon()}
        </div>
      </div>
      {additionalInfo && (
        <div className="mt-4">
          {additionalInfo}
        </div>
      )}
    </Card>
  );
}
