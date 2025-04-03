import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Upload,
  AlertCircle,
  FileSpreadsheet,
  Check,
  Download,
  Users,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stepper } from "@/components/ui/stepper";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { chatService } from "@/lib/chat-service";
import { downloadTransformedData } from "@/lib/spreadsheet-processor";
import FileUploadZone from "./components/FileUploadZone";
import get from "lodash/get";
import axios from "axios";

// Session storage keys
const SESSION_STORAGE_KEYS = {
  CURRENT_STEP: "payroll-import-current-step",
  UPLOADED_FILE: "payroll-import-uploaded-file",
  PROCESSED_DATA: "payroll-import-processed-data",
  IMPORT_STATS: "payroll-import-stats",
};

// Import process steps
const IMPORT_STEPS = [
  {
    id: 1,
    name: "Upload",
    label: "Upload Payroll Data",
    completed: false,
    current: true,
  },
  {
    id: 2,
    name: "Review",
    label: "Review and Adjust Data",
    completed: false,
    current: false,
  },
  {
    id: 3,
    name: "Complete",
    label: "Import Employees",
    completed: false,
    current: false,
  },
];

type ExtractedRow = Record<string, any> & {
  id: string;
  extractionErrors?: string[];
  excluded?: boolean;
};

type ProcessedData = {
  headers: string[];
  extractedData: ExtractedRow[];
  failedRows: {
    rowIndex: number;
    errors: string[];
    originalData: any;
  }[];
  fileName: string;
};

// Import stats type
type ImportStats = {
  totalRecords: number;
  successfulImports: number;
  failedImports: number;
  timestamp: string;
};

// Mapping from TARGET_HEADERS to Employee schema fields (including dot notation)
const HEADER_TO_FIELD_MAP: Record<string, string> = {
  "Emp No": "employeeNumber",
  "First Name": "other_names", // Assuming First Name maps to other_names
  "Last Name": "surname", // Assuming Last Name maps to surname
  "Full Name": "fullName", // Keep this for display if needed, though it might not be on the object directly
  "ID Number": "id_no",
  "NSSF No": "nssf_no",
  "KRA Pin": "tax_pin",
  "Position": "position",
  "Gross Pay": "gross_income",
  "Employer Advance": "employer_advances",
  "PAYE": "statutory_deductions.tax",
  "Levy": "statutory_deductions.levy",
  "NHIF": "statutory_deductions.nhif",
  "NSSF": "statutory_deductions.nssf",
  "Loan Deduction": "loan_deductions",
  "Bank Account Number": "bank_info.acc_no",
  "MPesa Number": "contact.phoneNumber",
  "Gender": "sex",
};

// Helper function to get potentially nested values safely
const getNestedValue = (obj: any, path: string, defaultValue: any = "") => {
  // Handle the temporary 'fullName' case specifically if needed for display
  if (path === "fullName") {
    return (
      `${obj?.other_names || ""} ${obj?.surname || ""}`.trim() || defaultValue
    );
  }
  return get(obj, path, defaultValue); // Use lodash get
};

const EmployeeImportPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState(IMPORT_STEPS);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(
    null
  );
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    column: string;
    value: any;
    fieldName?: string;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const navigate = useNavigate();

  // Target headers for display (matching the existing system)
  const TARGET_HEADERS = [
    "Emp No",
    "First Name",
    "Last Name",
    /*'Full Name',*/ "ID Number", // Removed Full Name for now unless needed
    "NSSF No",
    "KRA Pin",
    "NHIF",
    "Position",
    "Gross Pay",
    "Employer Advance",
    "PAYE",
    "Levy",
    "Loan Deduction",
  ];

  // Load saved state from session storage on component mount
  useEffect(() => {
    try {
      const savedStep = sessionStorage.getItem(
        SESSION_STORAGE_KEYS.CURRENT_STEP
      );
      const savedData = sessionStorage.getItem(
        SESSION_STORAGE_KEYS.PROCESSED_DATA
      );
      const savedStats = sessionStorage.getItem(
        SESSION_STORAGE_KEYS.IMPORT_STATS
      );

      if (savedStep) {
        const stepNumber = parseInt(savedStep, 10);
        setCurrentStep(stepNumber);
        updateStepperState(stepNumber);
      }

      if (savedData) {
        setProcessedData(JSON.parse(savedData));
      }

      if (savedStats) {
        setImportStats(JSON.parse(savedStats));
      }
    } catch (error) {
      console.error("Error loading saved import state:", error);
    }
  }, []);

  // Save current state to session storage when it changes
  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_STORAGE_KEYS.CURRENT_STEP,
        currentStep.toString()
      );

      if (processedData) {
        sessionStorage.setItem(
          SESSION_STORAGE_KEYS.PROCESSED_DATA,
          JSON.stringify(processedData)
        );
      }

      if (importStats) {
        sessionStorage.setItem(
          SESSION_STORAGE_KEYS.IMPORT_STATS,
          JSON.stringify(importStats)
        );
      }
    } catch (error) {
      console.error("Error saving import state:", error);
    }
  }, [currentStep, processedData, importStats]);

  // Update stepper state based on current step
  const updateStepperState = (step: number) => {
    setSteps((prevSteps) =>
      prevSteps.map((s) => ({
        ...s,
        current: s.id === step,
        completed: s.id < step,
      }))
    );
  };

  // Handle file selection
  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
  };

  // Process the uploaded file
  const handleProcessFile = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);

      // Use chatService to upload and process file
      const result = await chatService.uploadFile(file);

      // Add unique ID to each row if not present
      const dataWithIds = {
        ...result,
        extractedData: result.extractedData.map((row: Record<string, any>) => ({
          ...row,
          id:
            row.id ||
            `row-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        })),
      };

      setProcessedData(dataWithIds);
      // Adjust toast message based on counts
      const successCount = dataWithIds.extractedData.length;
      const failureCount = dataWithIds.failedRows?.length || 0;
      if (successCount > 0) {
        toast.success(
          `Successfully processed ${successCount} potential records.${
            failureCount > 0 ? ` ${failureCount} rows require attention.` : ""
          }`
        );
      } else if (failureCount > 0) {
        toast.warning(
          `Processed file, but ${failureCount} rows require attention. No records ready for import yet.`
        );
      } else {
        toast.info("Processed file, but no data was extracted.");
      }

      // Move to next step only if there's data to review
      if (successCount > 0 || failureCount > 0) {
        goToNextStep();
      } else {
        // Optionally handle the case where nothing was extracted (e.g., show message, stay on step 1)
        console.log("No data extracted, staying on upload step.");
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error(
        `Failed to process file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Go to next step
  const goToNextStep = () => {
    const nextStep = currentStep + 1;
    if (nextStep <= 3) {
      setCurrentStep(nextStep);
      updateStepperState(nextStep);
    }
  };

  // Go to previous step
  const goToPreviousStep = () => {
    const prevStep = currentStep - 1;
    if (prevStep >= 1) {
      setCurrentStep(prevStep);
      updateStepperState(prevStep);
    }
  };

  // Reset the import process
  const resetImport = () => {
    setCurrentStep(1);
    updateStepperState(1);
    setFile(null);
    setProcessedData(null);
    setImportStats(null);
    setSearchTerm("");
    setEditingCell(null);
    setStatusFilter(null);

    // Clear session storage
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.CURRENT_STEP);
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.PROCESSED_DATA);
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.IMPORT_STATS);
  };

  // Handle cancel import
  const handleCancelImport = () => {
    setShowCancelDialog(true);
  };

  // Confirm cancel import
  const confirmCancelImport = () => {
    resetImport();
    setShowCancelDialog(false);
    navigate("/employees");
  };

  // Handle confirm import button
  const handleConfirmImport = () => {
    if (!processedData || !processedData.extractedData.length) return;

    const nonExcludedRows = processedData.extractedData.filter(
      (row) => !row.excluded
    );
    if (nonExcludedRows.length === 0) {
      toast.error("No rows selected for import");
      return;
    }

    setShowConfirmDialog(true);
  };

  // Import the data
  const importData = async () => {
    if (!processedData || !processedData.extractedData.length) return;

    try {
      setIsImporting(true);
      setIsReviewing(true);
      setShowConfirmDialog(false);

      // Filter out excluded rows
      const dataToImport = processedData.extractedData.filter(
        (row) => !row.excluded
      );

      // Use the mutation to import employees - Backend expects Employee structure
      // The dataToImport already largely matches Partial<Employee> + temp fields
      await chatService.importEmployees(dataToImport);

      // Set import stats
      const stats: ImportStats = {
        totalRecords:
          processedData.extractedData.length +
          (processedData.failedRows?.length || 0), // Consider failed rows in total
        successfulImports: dataToImport.length,
        // Failed imports here might mean rows *excluded* by the user in the UI
        failedImports:
          processedData.extractedData.length -
          dataToImport.length +
          (processedData.failedRows?.length || 0),
        timestamp: new Date().toISOString(),
      };

      setImportStats(stats);
      toast.success(
        `Successfully initiated import for ${dataToImport.length} employees.`
      );

      // Move to success step
      goToNextStep();
    } catch (error) {
      console.error("Error importing employees:", error);
      toast.error(
        `Failed to import employees: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsImporting(false);
      setIsReviewing(false);
    }
  };

  // Handle row exclusion toggle
  const toggleRowExclusion = (rowId: string) => {
    if (!processedData) return;

    setProcessedData({
      ...processedData,
      extractedData: processedData.extractedData.map((row) => {
        if (row.id === rowId) {
          return { ...row, excluded: !row.excluded };
        }
        return row;
      }),
    });
  };

  // Handle cell edit
  const handleCellEdit = (rowId: string, displayHeader: string, value: any) => {
    const fieldPath = HEADER_TO_FIELD_MAP[displayHeader];
    if (!fieldPath) {
      console.warn(`No field mapping found for header: ${displayHeader}`);
      return; // Or handle differently
    }
    // Get the current value using the correct path for the input field
    const currentValue = getNestedValue(
      processedData?.extractedData.find((r) => r.id === rowId),
      fieldPath,
      value
    );
    setEditingCell({
      rowId,
      column: displayHeader,
      value: currentValue,
      fieldName: fieldPath,
    });
  };

  // Handle cell save
  const handleCellSave = () => {
    if (!editingCell || !processedData) return;

    const { rowId, column, value, fieldName } = editingCell;

    // Use a function to update nested state safely if lodash/fp is available,
    // otherwise, simple update for non-nested or manual update for nested:
    setProcessedData((prevData) => {
      if (!prevData) return null;
      return {
        ...prevData,
        extractedData: prevData.extractedData.map((row) => {
          if (row.id === rowId && fieldName) {
            const updatedRow = { ...row };
            // Basic nested update (consider a library like immutability-helper for complex cases)
            const keys = fieldName.split(".");
            let current: any = updatedRow;
            for (let i = 0; i < keys.length - 1; i++) {
              const key = keys[i];
              // Ensure path exists and clone objects along the path
              current[key] = current[key] ? { ...current[key] } : {};
              current = current[key];
            }
            // Parse the value based on field type if necessary before setting
            const finalKey = keys[keys.length - 1];
            if (
              fieldName.startsWith("statutory_deductions.") ||
              [
                "gross_income",
                "net_income",
                "loan_deductions",
                "employer_advances",
                "jahazii_advances",
                "house_allowance",
              ].includes(fieldName)
            ) {
              current[finalKey] = parseFloat(value) || 0; // Example parsing
            } else if (
              ["is_on_probation", "terms_accepted"].includes(fieldName)
            ) {
              current[finalKey] = ["true", "yes", "1"].includes(
                String(value).toLowerCase()
              );
            } else {
              current[finalKey] = value;
            }
            return updatedRow;
          }
          return row;
        }),
      };
    });

    setEditingCell(null);
    toast.success(`Updated ${column} value`);
  };

  // Cancel cell edit
  const handleCellEditCancel = () => {
    setEditingCell(null);
  };

  // Download processed data
  const handleDownloadProcessedData = async () => {
    if (!processedData) return;

    try {
      // Get the current date for the filename
      const dateStr = new Date().toLocaleDateString().replace(/\//g, "-");

      // Call the master template export API endpoint with axios
      const response = await axios.post(
        "/api/payroll/export/master-template",
        {
          data: processedData.extractedData.filter(row => !row.excluded), // Only send non-excluded rows
          fileName: `Import_Report_${dateStr}.xlsx`
        },
        {
          responseType: "blob", // Important for handling binary data
        }
      );

      // Create a download link and trigger the download
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Import_Report_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.error("Failed to download the report");
    }
  };

  // Navigate to employees page
  const navigateToEmployees = () => {
    // Reset all state
    resetImport();
    // Navigate to employees page
    navigate("/employees");
  };

  // Filter data based on search term and status filter
  const getFilteredData = () => {
    if (!processedData) return [];

    return processedData.extractedData.filter((row) => {
      // First apply search filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = Object.entries(row).some(([key, value]) => {
          if (typeof value !== "string" && typeof value !== "number")
            return false;
          return String(value).toLowerCase().includes(searchLower);
        });

        if (!matchesSearch) return false;
      }

      // Then apply status filter if active
      if (statusFilter) {
        // Critical error checks
        const hasMissingEmpNo = !getNestedValue(row, "employeeNumber");
        const hasMissingName =
          !getNestedValue(row, "other_names") &&
          !getNestedValue(row, "surname");
        const grossPay = getNestedValue(row, "gross_income", 0);
        const hasInvalidGrossPay = !grossPay || grossPay <= 0;
        const hasCriticalError = hasMissingName || hasInvalidGrossPay;
        const hasWarnings =
          Array.isArray(row.extractionErrors) &&
          row.extractionErrors.length > 0; // Check for warnings

        switch (statusFilter) {
          case "excluded":
            return !!row.excluded; // Use double-bang for explicit boolean
          case "error":
            return hasCriticalError && !row.excluded;
          case "warning":
            // Use the extractionErrors array populated by the backend sanity checks
            return hasWarnings && !hasCriticalError && !row.excluded;
          case "valid":
            // Valid if no critical errors, no warnings, and not excluded
            return !hasCriticalError && !hasWarnings && !row.excluded;
          default:
            return true; // Should not be reached if filters are exclusive
        }
      }

      return true; // If no status filter, return true (subject to search filter)
    });
  };

  // Count critical errors
  const countCriticalErrors = () => {
    if (!processedData) return 0;

    return processedData.extractedData.filter((row) => {
      if (row.excluded) return false; // Don't count excluded rows

      // Corrected critical error checks using getNestedValue
      const hasMissingName =
        !getNestedValue(row, "other_names") && !getNestedValue(row, "surname");
      const grossPay = getNestedValue(row, "gross_income", 0);
      const hasInvalidGrossPay = !grossPay || grossPay <= 0;
      const hasCriticalError = hasMissingName || hasInvalidGrossPay;

      return hasCriticalError;
    }).length;
  };

  // Add this function to handle deleting a row
  const handleDeleteRow = (rowId: string) => {
    if (!processedData) return;

    setProcessedData({
      ...processedData,
      extractedData: processedData.extractedData.filter(
        (row) => row.id !== rowId
      ),
    });

    toast.success("Record removed from import");
  };

  // Add this helper function to count records with specific status
  const countRecordsWithStatus = (status: string): number => {
    if (!processedData) return 0;

    // Use the same logic as getFilteredData for consistency
    return processedData.extractedData.filter((row) => {
      // Check exclusion first
      if (status === "excluded") {
        return !!row.excluded;
      }
      // Skip excluded rows if checking other statuses
      if (row.excluded) return false;

      // Corrected critical error checks
      const hasMissingName =
        !getNestedValue(row, "other_names") && !getNestedValue(row, "surname");
      const grossPay = getNestedValue(row, "gross_income", 0);
      const hasInvalidGrossPay = !grossPay || grossPay <= 0;
      const hasCriticalError = hasMissingName || hasInvalidGrossPay;
      const hasWarnings =
        Array.isArray(row.extractionErrors) && row.extractionErrors.length > 0; // Check for warnings

      // Placeholder warning logic (same as in getFilteredData)
      const hasMissingPosition = !getNestedValue(row, "position");

      switch (status) {
        case "error":
          return hasCriticalError;
        case "warning":
          return hasWarnings && !hasCriticalError;
        case "valid":
          return !hasCriticalError && !hasWarnings;
        default:
          return false; // Should not happen with defined statuses
      }
    }).length;
  };

  // Add this function to handle bulk deletion
  const handleBulkDelete = () => {
    if (!processedData) return;

    // Get IDs of currently filtered records
    const filteredIds = getFilteredData().map((row) => row.id);

    if (filteredIds.length === 0) {
      toast.error("No records to delete");
      return;
    }

    // Remove filtered records
    setProcessedData({
      ...processedData,
      extractedData: processedData.extractedData.filter(
        (row) => !filteredIds.includes(row.id)
      ),
    });

    toast.success(`Removed ${filteredIds.length} records`);
  };

  // Render step content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Upload Payroll Data</CardTitle>
                <CardDescription>
                  Upload an Excel or CSV file containing employee payroll data
                  for processing and import.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploadZone
                  onFileSelected={handleFileSelected}
                  file={file}
                  isProcessing={isProcessing}
                  accept=".xlsx,.xls,.csv"
                  maxSize={10 * 1024 * 1024} // 10MB
                />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleCancelImport}>
                  Cancel
                </Button>
                <Button
                  onClick={handleProcessFile}
                  disabled={!file || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Next"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Review Import Data</CardTitle>
                <CardDescription>
                  Review, edit, and validate the extracted employee data before
                  importing.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                {isReviewing ? (
                  <div className="h-[calc(100vh-460px)] min-h-[400px] flex items-center justify-center flex-col gap-4">
                    <RefreshCw className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-lg font-medium">
                      Importing employee data...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This may take a few seconds.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 flex flex-wrap items-center gap-3 border-b">
                      <div className="flex flex-1 items-center gap-2">
                        <Input
                          placeholder="Search records..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="max-w-xs"
                        />
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        {processedData && (
                          <>
                            <Badge
                              variant="outline"
                              className={`text-xs cursor-pointer ${
                                !statusFilter
                                  ? "bg-primary text-primary-foreground"
                                  : ""
                              }`}
                              onClick={() => setStatusFilter(null)}
                            >
                              All ({processedData.extractedData.length})
                            </Badge>

                            <Badge
                              variant="secondary"
                              className={`text-xs cursor-pointer ${
                                statusFilter === "excluded"
                                  ? "ring-2 ring-ring"
                                  : ""
                              }`}
                              onClick={() =>
                                setStatusFilter(
                                  statusFilter === "excluded"
                                    ? null
                                    : "excluded"
                                )
                              }
                            >
                              Excluded (
                              {
                                processedData.extractedData.filter(
                                  (r) => r.excluded
                                ).length
                              }
                              )
                            </Badge>

                            <Badge
                              variant="destructive"
                              className={`text-xs cursor-pointer ${
                                statusFilter === "error"
                                  ? "ring-2 ring-ring"
                                  : ""
                              }`}
                              onClick={() =>
                                setStatusFilter(
                                  statusFilter === "error" ? null : "error"
                                )
                              }
                            >
                              Error ({countRecordsWithStatus("error")})
                            </Badge>

                            <Badge
                              variant="warning"
                              className={`text-xs cursor-pointer ${
                                statusFilter === "warning"
                                  ? "ring-2 ring-ring"
                                  : ""
                              }`}
                              onClick={() =>
                                setStatusFilter(
                                  statusFilter === "warning" ? null : "warning"
                                )
                              }
                            >
                              Warning ({countRecordsWithStatus("warning")})
                            </Badge>

                            <Badge
                              variant="success"
                              className={`text-xs cursor-pointer ${
                                statusFilter === "valid"
                                  ? "ring-2 ring-ring"
                                  : ""
                              }`}
                              onClick={() =>
                                setStatusFilter(
                                  statusFilter === "valid" ? null : "valid"
                                )
                              }
                            >
                              Valid ({countRecordsWithStatus("valid")})
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>

                    {getFilteredData().length > 0 && statusFilter && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive hover:bg-destructive/10"
                        onClick={() => setShowBulkDeleteDialog(true)}
                      >
                        Delete {getFilteredData().length} filtered records
                      </Button>
                    )}

                    <div className="h-[calc(100vh-460px)] min-h-[400px]">
                      <ScrollArea className="h-full w-full">
                        {processedData && getFilteredData().length > 0 ? (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[50px] sticky left-0 bg-background">
                                    <span className="sr-only">Include</span>
                                  </TableHead>
                                  {TARGET_HEADERS.map((header) => (
                                    <TableHead
                                      key={header}
                                      className="whitespace-nowrap"
                                    >
                                      {header}
                                    </TableHead>
                                  ))}
                                  <TableHead className="sticky right-0 bg-background">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {getFilteredData().map((row) => {
                                  // Corrected critical error checks for rendering
                                  const hasMissingName =
                                    !getNestedValue(row, "other_names") &&
                                    !getNestedValue(row, "surname");
                                  const grossPay = getNestedValue(row, "gross_income", 0);
                                  const hasInvalidGrossPay = !grossPay || grossPay <= 0;
                                  const hasCriticalError = hasMissingName || hasInvalidGrossPay;
                                  // Check for warnings from backend
                                  const hasWarnings =
                                    Array.isArray(row.extractionErrors) &&
                                    row.extractionErrors.length > 0;

                                  return (
                                    <TableRow
                                      key={row.id}
                                      className={
                                        row.excluded
                                          ? "opacity-50 bg-muted/30"
                                          : ""
                                      }
                                    >
                                      <TableCell className="sticky left-0 bg-background">
                                        <Checkbox
                                          checked={!row.excluded}
                                          onCheckedChange={() =>
                                            toggleRowExclusion(row.id)
                                          }
                                        />
                                      </TableCell>

                                      {TARGET_HEADERS.map((header) => {
                                        const fieldPath =
                                          HEADER_TO_FIELD_MAP[header];
                                        const displayValue = getNestedValue(
                                          row,
                                          fieldPath
                                        );

                                        // Determine if THIS SPECIFIC cell contributes to a critical error
                                        const cellIsEmpNoError = false; // Employee number is no longer a critical error
                                        // Name error applies if either name field is missing *and* this is a name field
                                        const cellIsNameError =
                                          (fieldPath === "other_names" ||
                                            fieldPath === "surname") &&
                                          hasMissingName;
                                        // Gross pay error applies if the field is missing or zero
                                        const cellIsGrossPayError = 
                                          fieldPath === "gross_income" && hasInvalidGrossPay;
                                        const cellHasError = cellIsNameError || cellIsGrossPayError;

                                        return (
                                          <TableCell
                                            key={`${row.id}-${header}`}
                                            className="py-2 min-w-[120px]"
                                          >
                                            {editingCell &&
                                            editingCell.rowId === row.id &&
                                            editingCell.column === header ? (
                                              <div className="flex gap-2">
                                                <Input
                                                  value={editingCell.value}
                                                  onChange={(e) =>
                                                    setEditingCell({
                                                      ...editingCell,
                                                      value: e.target.value,
                                                    })
                                                  }
                                                  className="h-8 min-w-[100px]"
                                                  // Optionally set input type based on field
                                                  type={
                                                    typeof getNestedValue(
                                                      row,
                                                      fieldPath
                                                    ) === "number"
                                                      ? "number"
                                                      : "text"
                                                  }
                                                />
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={handleCellSave}
                                                  className="h-8 w-8 p-0"
                                                >
                                                  <Check className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={handleCellEditCancel}
                                                  className="h-8 w-8 p-0"
                                                >
                                                  <X className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            ) : (
                                              <div className="flex items-center justify-between group">
                                                <span
                                                  className={`truncate max-w-[200px] ${
                                                    cellHasError
                                                      ? "text-destructive font-semibold"
                                                      : "" // Highlight specific error cell
                                                  }`}
                                                  title={String(displayValue)}
                                                >
                                                  {/* Format the display value */}
                                                  {
                                                    displayValue !== undefined &&
                                                    displayValue !== null
                                                      ? typeof displayValue ===
                                                        "number"
                                                        ? Number.isInteger(
                                                            displayValue
                                                          )
                                                          ? displayValue.toString()
                                                          : displayValue.toFixed(
                                                              2
                                                            ) // Keep number formatting
                                                        : typeof displayValue ===
                                                          "boolean"
                                                        ? displayValue
                                                          ? "Yes"
                                                          : "No"
                                                        : String(displayValue) // Default to string
                                                      : "" /* Render empty string for null/undefined */
                                                  }
                                                </span>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  // Pass the current display value to edit function
                                                  onClick={() =>
                                                    handleCellEdit(
                                                      row.id,
                                                      header,
                                                      displayValue
                                                    )
                                                  }
                                                  className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                                  disabled={row.excluded}
                                                >
                                                  {/* Edit SVG Icon */}
                                                  <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="15"
                                                    height="15"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                  >
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                  </svg>
                                                </Button>
                                              </div>
                                            )}
                                          </TableCell>
                                        );
                                      })}

                                      <TableCell className="sticky right-0 bg-background">
                                        <div className="flex items-center gap-2">
                                          <Badge
                                            variant={
                                              row.excluded
                                                ? "secondary"
                                                : hasCriticalError
                                                ? "destructive"
                                                : hasWarnings // Check for warnings
                                                ? "warning"
                                                : "success"
                                            }
                                            title={
                                              hasWarnings
                                                ? row.extractionErrors?.join("\n")
                                                : undefined
                                            }
                                          >
                                            {row.excluded
                                              ? "Excluded"
                                              : hasCriticalError
                                              ? "Error"
                                              : hasWarnings // Check for warnings
                                              ? "Warning"
                                              : "Valid"}
                                          </Badge>

                                          {/* Add this delete button */}
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                              handleDeleteRow(row.id)
                                            }
                                            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            title="Delete record"
                                          >
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              width="15"
                                              height="15"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <path d="M3 6h18"></path>
                                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                              <line
                                                x1="10"
                                                y1="11"
                                                x2="10"
                                                y2="17"
                                              ></line>
                                              <line
                                                x1="14"
                                                y1="11"
                                                x2="14"
                                                y2="17"
                                              ></line>
                                            </svg>
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="p-8 text-center text-muted-foreground">
                            {processedData
                              ? "No matching records found."
                              : "No data available."}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t mt-2 pt-6">
                <Button
                  variant="outline"
                  onClick={goToPreviousStep}
                  disabled={isReviewing}
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  // Update disabled check to use the corrected function
                  disabled={
                    !processedData ||
                    countCriticalErrors() > 0 ||
                    processedData.extractedData.filter((r) => !r.excluded)
                      .length === 0 ||
                    isReviewing
                  }
                >
                  {isReviewing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Import Data"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="text-center pb-6">
                <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-4">
                  <Check className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">
                  Import Successful
                </CardTitle>
                <CardDescription className="text-base">
                  {importStats
                    ? `Successfully imported ${importStats.successfulImports} employees.`
                    : "Your data has been imported successfully."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                {importStats && (
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {importStats.successfulImports}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Imported
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {importStats.failedImports}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Excluded
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {importStats.totalRecords}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Records
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleDownloadProcessedData}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={navigateToEmployees}
                >
                  <Users className="mr-2 h-4 w-4" />
                  View Employees
                </Button>
                <Button className="w-full sm:w-auto" onClick={resetImport}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Another File
                </Button>
              </CardFooter>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Import Payroll Data
          </h1>
          <p className="text-muted-foreground">
            Upload, validate and import employee payroll data in a few simple
            steps.
          </p>
        </div>
      </div>

      <Stepper currentStep={currentStep} steps={steps} />

      {renderStepContent()}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Import</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the import process? All uploaded
              data and progress will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
            >
              Continue Import
            </Button>
            <Button variant="destructive" onClick={confirmCancelImport}>
              Yes, Cancel Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Import</DialogTitle>
            <DialogDescription>
              {processedData && (
                <>
                  You are about to import{" "}
                  {
                    processedData.extractedData.filter((r) => !r.excluded)
                      .length
                  }{" "}
                  employee records. This action cannot be undone. Do you want to
                  continue?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button onClick={importData} disabled={isImporting}>
              {isImporting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Confirm Import"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {getFilteredData().length}{" "}
              records? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                handleBulkDelete();
                setShowBulkDeleteDialog(false);
              }}
            >
              Delete Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeImportPage;
