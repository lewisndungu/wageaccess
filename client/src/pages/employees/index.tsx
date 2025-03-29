import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { EmployeeTable } from "@/components/employees/EmployeeTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import axios from "axios";
import { Employee } from "@shared/schema";
import EmployeeImportPage from "./import";

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("list");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const {
    data: employeeData,
    isLoading,
    error,
  } = useQuery<Employee[]>({
    queryKey: ["/api/employees/active"],
    queryFn: async () => {
      const response = await fetch("/api/employees/active");
      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }
      return response.json();
    },
  });

  // Import employees mutation
  const importEmployeesMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await axios.post("/api/import/employees", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Import successful",
        description: "Employees have been imported successfully.",
      });
      // Invalidate employees queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/employees/active"] });
      setActiveTab("list");
      setFile(null);
      setIsUploading(false);
    },
    onError: (error) => {
      console.error("Error importing employees:", error);
      toast({
        title: "Import failed",
        description: "Failed to import employees. Please try again.",
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await importEmployeesMutation.mutateAsync(formData);
    } catch (err) {
      // Error handling is done in the mutation's onError
    }
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>ctive
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] space-y-4">
        <p className="text-destructive">Failed to load employees</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
        <div className="flex space-x-2">
          <Link to="/employees/import">
            <Button className="ml-2">
              <Upload className="mr-2 h-4 w-4" />
              Import Payroll Data
            </Button>
          </Link>
        </div>
      </div>

      <EmployeeTable data={employeeData || []} isLoading={isLoading} />
    </div>
  );
}
