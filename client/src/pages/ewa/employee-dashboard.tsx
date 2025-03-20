import { EmployeeEWADashboard } from "@/components/ewa/EmployeeEWADashboard";
import { useParams } from "react-router-dom";

export default function EmployeeEWADashboardPage() {
  const { id } = useParams<{ id: string }>();
  const employeeId = id ? parseInt(id) : 1; // Default to employee 1 if no ID is provided
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">My Earned Wage Access</h1>
      </div>
      
      <EmployeeEWADashboard employeeId={employeeId} />
    </div>
  );
}