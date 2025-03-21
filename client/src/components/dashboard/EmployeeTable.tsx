import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { useNavigate } from "react-router-dom";
import { ColumnDef } from "@tanstack/react-table";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

interface Employee {
  id: number;
  employeeNumber: string;
  name: string;
  department: string;
  position: string;
  contact: string;
  email: string;
  status: "present" | "absent" | "late";
  profileImage?: string;
}

interface EmployeeTableProps {
  data: Employee[];
  isLoading?: boolean;
}

export function EmployeeTable({ data, isLoading }: EmployeeTableProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("active");
  
  const handleViewProfile = (employee: Employee) => {
    navigate(`/employees/${employee.id}`);
  };
  
  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "name",
      header: "Employee",
      cell: ({ row }) => {
        const employee = row.original;
        return (
          <div className="flex items-center">
            <Avatar className="h-9 w-9 mr-3">
              <AvatarImage src={employee.profileImage} alt={employee.name} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{employee.name}</p>
              <p className="text-xs text-muted-foreground">{employee.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "employeeNumber",
      header: "ID",
    },
    {
      accessorKey: "department",
      header: "Department",
    },
    {
      accessorKey: "position",
      header: "Position",
    },
    {
      accessorKey: "contact",
      header: "Contact",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        if (status === "present") {
          return <Badge className="bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/20">Present</Badge>;
        } else if (status === "late") {
          return <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/20">Late</Badge>;
        } else {
          return <Badge className="bg-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/20">Absent</Badge>;
        }
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        return (
          <div className="text-right">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleViewProfile(row.original);
              }}
              className="text-primary hover:text-primary/80"
            >
              <i className="ri-eye-line"></i>
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <i className="ri-edit-line"></i>
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <i className="ri-more-2-fill"></i>
            </Button>
          </div>
        );
      },
    },
  ];

  const filteredData = activeTab === "active" 
    ? data
    : [];
  
  // If we had actual data:
  // const filteredData = activeTab === "active" 
  //  ? data.filter(employee => employee.isActive) 
  //  : data.filter(employee => !employee.isActive);

  return (
    <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <Tabs defaultValue="active" onValueChange={setActiveTab}>
        <div className="border-b border-gray-200 dark:border-gray-700 px-4">
          <TabsList className="bg-transparent border-b-0">
            <TabsTrigger 
              value="active"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none border-b-2 border-transparent px-4 py-2"
            >
              Active (220)
            </TabsTrigger>
            <TabsTrigger 
              value="inactive"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none border-b-2 border-transparent px-4 py-2"
            >
              Inactive (28)
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="active" className="p-4">
          <DataTable 
            columns={columns} 
            data={filteredData} 
            searchColumn="name"
            onRowClick={handleViewProfile}
          />
        </TabsContent>
        <TabsContent value="inactive" className="p-4">
          <DataTable 
            columns={columns} 
            data={filteredData} 
            searchColumn="name"
            onRowClick={handleViewProfile}
          />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
