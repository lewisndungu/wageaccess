import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { useNavigate } from "react-router-dom";
import { ColumnDef } from "@tanstack/react-table";
import { User, Phone, Pencil, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Employee } from "@shared/schema";

// Utility function to safely parse JSON strings
const parseJsonField = (jsonString: string | null | undefined) => {
  if (!jsonString) return null;

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return null;
  }
};

type BasicEmployee = Pick<
  Employee,
  | "id"
  | "employeeNumber"
  | "other_names"
  | "surname"
  | "department"
  | "position"
  | "status"
  | "contact"
>;

interface EmployeeTableProps {
  data?: Employee[];
  isLoading?: boolean;
}

export function EmployeeTable({ data = [], isLoading }: EmployeeTableProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("active");

  const handleViewProfile = (employee: Employee) => {
    navigate(`/employees/${employee.id}`);
  };

  const columns = [
    {
      accessorKey: "employeeNumber",
      header: "Employee ID",
    },
    {
      accessorKey: "other_names",
      header: "Name",
      cell: ({ row }: { row: any }) => {
        const employee = row.original as Employee;
        return `${employee.other_names} ${employee.surname}`;
      },
    },
    {
      accessorKey: "position",
      header: "Position",
    },
    {
      id: "actions",
      cell: ({ row }: { row: any }) => {
        const employee = row.original as Employee;
        return (
          <div className="flex gap-x-4">
            <Button size="sm" onClick={() => handleViewProfile(employee)}>
              <Eye className="mr-1 h-4 w-4" />
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/employees/${employee.id}/edit`)}
            >
              <Pencil className="mr-1 h-4 w-4" />
              Edit
            </Button>
          </div>
        );
      },
    },
  ];

  const filteredData = data.filter((employee) => {
    if (activeTab === "active") {
      return employee.status === "active";
    }
    return employee.status === "inactive";
  });

  const activeCount = data.filter((emp) => emp.status === "active").length;
  const inactiveCount = data.filter((emp) => emp.status === "inactive").length;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
        <TabsTrigger value="inactive">Inactive ({inactiveCount})</TabsTrigger>
      </TabsList>

      <Card className="">
        <TabsContent value="active">
          <DataTable
            columns={columns}
            data={filteredData}
            searchColumn="other_names"
            onRowClick={handleViewProfile}
          />
        </TabsContent>

        <TabsContent value="inactive">
          <DataTable
            columns={columns}
            data={filteredData}
            searchColumn={[
              "other_names",
              "surname",
              "employeeNumber",
              "department.name",
              "position",
            ]}
            onRowClick={handleViewProfile}
          />
        </TabsContent>
      </Card>
    </Tabs>
  );
}
