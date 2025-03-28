import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { EmployeeTable } from "@/components/dashboard/EmployeeTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Search, Filter, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import axios from "axios";
import { Employee } from "@shared/schema";

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("list");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  const { data: employeeData, isLoading, error } = useQuery<Employee[]>({
    queryKey: ['/api/employees/active'],
    queryFn: async () => {
      const response = await fetch('/api/employees/active');
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      return response.json();
    }
  });

  // Import employees mutation
  const importEmployeesMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await axios.post('/api/import/employees', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Import successful",
        description: "Employees have been imported successfully.",
      });
      // Invalidate employees queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/employees/active'] });
      setActiveTab("list");
      setFile(null);
      setIsUploading(false);
    },
    onError: (error) => {
      console.error('Error importing employees:', error);
      toast({
        title: "Import failed",
        description: "Failed to import employees. Please try again.",
        variant: "destructive",
      });
      setIsUploading(false);
    }
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
    formData.append('file', file);
    
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
            <Button variant="outline" size="sm" className="ml-2">
              <Upload className="mr-2 h-4 w-4" />
              Import Payroll Data
            </Button>
          </Link>
          <Button 
            onClick={() => navigate("/employees/new")}
            className="flex items-center"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            New Employee
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="list">Employee List</TabsTrigger>
          <TabsTrigger value="import">Import Employees</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative sm:w-96">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search employees..." className="pl-8" />
            </div>
            <Button variant="outline" className="flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
          
          <EmployeeTable data={employeeData || []} isLoading={isLoading} />
        </TabsContent>
        
        <TabsContent value="import">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Import Employees</h3>
                <p className="text-sm text-muted-foreground">
                  Upload a CSV or XLSX file with employee data. Make sure the file follows the required format.
                </p>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Label htmlFor="file">Upload File</Label>
                <input
                  type="file"
                  id="file"
                  ref={fileInputRef}
                  accept=".csv,.xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div 
                  className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={handleSelectFile}
                >
                  <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">
                    {file ? file.name : "Drag and drop your file here"}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {file 
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB` 
                      : "Supports CSV and XLSX files up to 10MB"}
                  </p>
                  <Button size="sm" type="button" onClick={(e) => { e.stopPropagation(); handleSelectFile(); }}>
                    Select File
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Label>Download Template</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Download our template file to ensure your data is formatted correctly.
                </p>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 384 512">
                      <path fill="currentColor" d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm76.45 211.36l-96.42 95.7c-6.65 6.61-17.39 6.61-24.04 0l-96.42-95.7C73.42 337.29 80.54 320 94.82 320H160v-80c0-8.84 7.16-16 16-16h32c8.84 0 16 7.16 16 16v80h65.18c14.28 0 21.4 17.29 11.27 27.36zM377 105L279.1 7c-4.5-4.5-10.6-7-17-7H256v128h128v-6.1c0-6.3-2.5-12.4-7-16.9z" />
                    </svg>
                    CSV Template
                  </Button>
                  <Button variant="outline" size="sm">
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 384 512">
                      <path fill="currentColor" d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm64 236c0 6.6-5.4 12-12 12h-88v88c0 6.6-5.4 12-12 12h-8c-6.6 0-12-5.4-12-12v-88h-88c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h88v-88c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v88h88c6.6 0 12 5.4 12 12v8zm57-155L279.1 7c-4.5-4.5-10.6-7-17-7H256v128h128v-6.1c0-6.3-2.5-12.4-7-16.9z" />
                    </svg>
                    XLSX Template
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setActiveTab("list")}>Cancel</Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={!file || isUploading}
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    'Upload and Import'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
