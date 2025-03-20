import { Card } from "@/components/ui/card";

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
  const changeColorClass = isPositiveChange ? "text-[#10B981]" : "text-[#EF4444]";
  const bgColorClass = `bg-${colorClass}/10`;
  
  return (
    <Card className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-glass dark:shadow-glass-dark">
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <div className="flex items-end mt-1">
            <p className="text-2xl font-bold">{value}</p>
            <p className={`text-sm ml-2 ${changeColorClass}`}>{change}</p>
          </div>
        </div>
        <div className={`${bgColorClass} p-2 rounded-lg`}>
          <i className={`ri-${iconName} text-xl ${colorClass}`}></i>
        </div>
      </div>
      {additionalInfo && (
        <div className="mt-3">
          {additionalInfo}
        </div>
      )}
    </Card>
  );
}
