import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  X, 
  Edit, 
  CheckCircle, 
  AlertCircle,
  AlertTriangle,
  Info,
  UserPlus,
  DollarSign,
  Users,
  HelpCircle,
  User,
  Search,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { processFile, downloadTransformedData } from '@/lib/spreadsheet-processor';
import { calculatePayrollBasedOnAttendance } from '@/lib/kenyan-payroll';
import { useEmployeeStore } from '@/lib/store';
import type { Advance as StoreAdvance } from '@/lib/store';
import type { Employee, InsertEmployee, ServerPayrollResponse } from "@shared/schema";
import { cn } from '@/lib/utils';
import { 
  formatKESCurrency, 
  formatKENumber, 
  formatKEDate, 
  formatKEDateTime,
  formatRelativeTime
} from '@/lib/format-utils';
import { chatService, Message, ChatAction, COMMON_ACTIONS } from '@/lib/chat-service';
import HelpDialog from './HelpDialog';
import EmployeeCard from './EmployeeCard';
import ActionPills from './ActionPills';
import { useTheme } from '../ui/theme-provider';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from '@/lib/api';
import { useDebounce } from '@/lib/hooks';

type StoreEmployee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  hireDate: string;
  salary: number;
  address: string;
  advances: any[];
  attendance: {
    present: number;
    absent: number;
    late: number;
    total: number;
  };
};

type ProcessedData = {
  extractedData: InsertEmployee[];
  failedRows: {
    row: Record<string, any>;
    reason: string;
  }[];
  fileName: string;
};

const TARGET_HEADERS = [
  'Emp No', 'First Name', 'Last Name', 'ID Number', 'NSSF No', 'KRA Pin', 'NHIF No', 'Position', 'Gross Pay', 'Employer Advance', 'PAYE', 'NSSF', 'NHIF', 'Levy', 'Loan Deduction', 'Net Pay'
];

const ChatInterface = () => {
  // Load saved messages from local storage
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [currentData, setCurrentData] = useState<ProcessedData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editingCell, setEditingCell] = useState<{rowId: string, column: string, value: any, fieldName?: keyof InsertEmployee} | null>(null);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [calculatedPayrollData, setCalculatedPayrollData] = useState<ServerPayrollResponse[] | null>(null);
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchPreview, setShowSearchPreview] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const addEmployeesToStore = useEmployeeStore((state) => state.addEmployees);
  const allEmployees = useEmployeeStore((state) => state.employees);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  
  // Debounce the search input
  const debouncedSearchTerm = useDebounce(inputMessage.toLowerCase().replace('find employee ', '').trim(), 300);
  
  // Load message history from API when component mounts
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        const savedMessages = await chatService.getRecentMessages();
        
        if (savedMessages.length === 0) {
          // Show welcome message if no message history
          setMessages([{
            id: '1',
            type: 'system',
            content: 'Welcome to the HR Data Assistant. I can help you with employee data processing, payroll calculations, and managing your workforce. What would you like to do today?',
            timestamp: new Date(),
            actions: [
              {
                id: 'help',
                label: 'What can you do?',
                action: () => processUserMessage('What can you do?')
              }
            ]
          }]);
        } else {
          setMessages(savedMessages);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        // Show fallback welcome message on error
        setMessages([{
          id: '1',
          type: 'system',
          content: 'Welcome to the HR Data Assistant. I can help you with employee data processing, payroll calculations, and managing your workforce. What would you like to do today?',
          timestamp: new Date()
        }]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessages();
  }, []);
  
  // Save messages locally when they change
  useEffect(() => {
    if (messages.length > 0) {
      chatService.saveMessages(messages);
    }
  }, [messages]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Effect for handling employee search
  useEffect(() => {
    const searchEmployees = async () => {
      if (!inputMessage.toLowerCase().startsWith('find employee') || !debouncedSearchTerm) {
        setSearchResults([]);
        setShowSearchPreview(false);
        return;
      }
      
      setIsSearching(true);
      setShowSearchPreview(true);
      
      try {
        const results = await chatService.searchEmployee(debouncedSearchTerm);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching employees:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    
    searchEmployees();
  }, [debouncedSearchTerm, inputMessage]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    
    try {
      // Process message on server
      const response = await chatService.processMessage(inputMessage);
      
      // Add server response with client-side action handlers
      const processedResponse = {
        ...response,
        actions: response.actions?.map(action => ({
          ...action,
          action: () => handleActionClick(action)
        }))
      };
      
      setMessages(prev => [...prev, processedResponse]);
    } catch (error) {
      console.error('Error processing message:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'error',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date()
      }]);
    }
  };
  
  const trackCommand = async (command: string) => {
    try {
      await api.post('/chat/command', { command });
    } catch (error) {
      console.error('Error tracking command:', error);
    }
  };

  const trackSearch = async (search: string) => {
    try {
      await api.post('/chat/search', { search });
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  };

  const handleActionClick = async (action: ChatAction) => {
    // Track the action as a command
    if (action.id) {
      await trackCommand(action.id);
    }
    
    // First check if the action already has a client-side handler
    if (action.action && typeof action.action === 'function') {
      action.action();
      return;
    }
    
    // Fall back to mapping by ID if the action comes from the server
    if (action.id) {
      switch (action.id) {
        case 'view-all-employees':
          navigate('/employees');
          break;
        case 'add-employee':
          navigate('/employees?new=true');
          break;
        case 'upload-employees':
        case 'upload-data':
          handleUploadClick();
          break;
        case 'find-employee':
          setInputMessage('Find employee ');
          break;
        case 'calculate-payroll':
          handleCalculatePayroll();
          break;
        case 'help':
          setShowHelpDialog(true);
          break;
        case 'view-data':
          setShowPreview(true);
          break;
        case 'import-data':
          handleImportEmployees();
          break;
        default:
          break;
      }
    }
  };
  
  const processUserMessage = async (message: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };
    
    setMessages((prev: Message[]) => [...prev, userMessage]);
    
    try {
      const { data } = await api.post('/chat/message', {
        message,
        userId: 'current-user',
        timestamp: new Date()
      });
      
      // Add server response with client-side action handlers
      const processedResponse: Message = {
        ...data,
        actions: data.actions?.map((action: ChatAction) => ({
          ...action,
          action: () => handleActionClick(action)
        })),
        timestamp: new Date(data.timestamp),
        employeeData: data.employeeData ? {
          ...data.employeeData,
          created_at: new Date(data.employeeData.created_at),
          modified_at: new Date(data.employeeData.modified_at),
          startDate: data.employeeData.startDate ? new Date(data.employeeData.startDate) : undefined,
          last_withdrawal_time: data.employeeData.last_withdrawal_time ? new Date(data.employeeData.last_withdrawal_time) : undefined
        } : undefined
      };
      
      setMessages((prev: Message[]) => [...prev, processedResponse]);
    } catch (error: any) {
      console.error('Error processing message:', error);
      setMessages((prev: Message[]) => [...prev, {
        id: Date.now().toString(),
        type: 'error',
        content: error.message || 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date()
      }]);
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'batch-upload':
        fileInputRef.current?.click();
        break;
      case 'export-payroll':
        handleCalculatePayroll();
        break;
      case 'manage-employees':
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'system',
          content: 'What would you like to do with employee records? You can try: "Find employee John", "Update John\'s position to Manager", or ask for specific employee information.',
          timestamp: new Date(),
          actions: [
            {
              id: 'find-employee',
              label: 'Find Employee',
              action: () => setInputMessage('Find employee ')
            },
            {
              id: 'update-employee',
              label: 'Update Employee',
              action: () => setInputMessage('Update employee ')
            }
          ]
        }]);
        break;
      default:
        break;
    }
  };

  const processSpreadsheet = async (file: File) => {
    try {
      setIsUploading(true);
      
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'system',
          content: `Processing file: ${file.name}`,
          timestamp: new Date()
        }
      ]);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const { data } = await api.post('/api/chat/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      const processedData: ProcessedData = data;
      setCurrentData(processedData);
      
      const fileMessage: Message = {
        id: Date.now().toString(),
        type: 'file',
        content: `Uploaded: ${file.name}`,
        timestamp: new Date(),
        fileData: processedData,
        actions: [
          {
            id: 'view-data',
            label: 'View & Edit',
            action: () => setShowPreview(true)
          },
          {
            id: 'import-data',
            label: 'Import Employees',
            action: () => handleImportEmployees()
          }
        ]
      };
      
      setMessages(prev => [
        ...prev, 
        fileMessage,
        {
          id: (Date.now() + 1).toString(),
          type: 'extraction',
          content: `Successfully extracted ${processedData.extractedData.length} rows of data. ${processedData.failedRows.length} rows had issues.`,
          timestamp: new Date()
        }
      ]);
      
      setShowPreview(true);
      
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast.error(error.message || 'Failed to process the spreadsheet');
      
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'error',
          content: `Error processing file: ${error.message || 'Unknown error'}`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExt !== 'xlsx' && fileExt !== 'csv') {
      toast.error('Please upload only Excel (.xlsx) or CSV (.csv) files');
      return;
    }
    
    processSpreadsheet(file);
    
    e.target.value = '';
  };
  
  // Create a mutation for importing employees
  const importEmployeesMutation = useMutation({
    mutationFn: async (employeeData: InsertEmployee[]) => {
      const { data } = await api.post('/api/chat/import-employees', {
        employees: employeeData
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['active-employees'] });
    },
    onError: (error: any) => {
      console.error('Error importing employees:', error);
      toast.error(error.message || 'Failed to import employees');
    }
  });

  const handleImportEmployees = async () => {
    if (!currentData || !currentData.extractedData.length) return;
    
    const confirmAction = async () => {
      try {
        // Use the mutation to import employees
        await importEmployeesMutation.mutateAsync(currentData.extractedData);
        
        // Transform and add imported employees to the Employees component store
        const transformedEmployees = currentData.extractedData.map((emp): StoreEmployee => {
          const fullName = `${emp.other_names ?? ''} ${emp.surname ?? ''}`.trim();
          return {
            id: emp.id ?? `emp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: fullName || 'Unknown Name',
            email: emp.contact?.email || `${(emp.other_names ?? 'user').toString().toLowerCase()}.${(emp.surname ?? 'unknown').toString().toLowerCase()}@company.com`,
            phone: emp.contact?.phoneNumber || '(000) 000-0000',
            position: emp.position || 'Employee',
            hireDate: emp.startDate ? formatKEDate(emp.startDate) : formatKEDate(new Date()),
            salary: emp.gross_income ?? 0,
            address: emp.address || 'No address provided',
            advances: [],
            attendance: {
              present: Math.floor(Math.random() * 20) + 150,
              absent: Math.floor(Math.random() * 10),
              late: Math.floor(Math.random() * 8),
              total: 180,
            }
          };
        });
        
        // Add the transformed employees to the store
        addEmployeesToStore(transformedEmployees as any);
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'system',
          content: `✅ Successfully imported ${currentData.extractedData.length} employees. You can view them in the Employees section.`,
          timestamp: new Date(),
          actions: [
            {
              id: 'view-employees',
              label: 'View Employees',
              action: () => navigate('/employees')
            },
            {
              id: 'calculate-payroll',
              label: 'Calculate Payroll',
              action: () => handleCalculatePayroll()
            }
          ]
        }]);
        
        setShowPreview(false);
      } catch (error) {
        console.error('Error importing employees:', error);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'error',
          content: `Error importing employees: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        }]);
      }
    };
    
    const cancelAction = () => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'system',
        content: `Import canceled. No employees were added to the system.`,
        timestamp: new Date()
      }]);
    };
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'confirm',
      content: `Are you sure you want to import ${currentData.extractedData.length} employees from the spreadsheet?`,
      timestamp: new Date(),
      confirmAction,
      cancelAction
    }]);
  };

  const handleCalculatePayroll = async (employeeIds?: string[]) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'system',
      content: `Calculating payroll for ${employeeIds ? employeeIds.length + ' selected' : 'all active'} employees...`,
      timestamp: new Date()
    }]);
    setIsLoading(true);
    setCalculatedPayrollData(null);

    try {
      const { data } = await api.post('/api/chat/calculate-payroll', {
        employeeIds,
        periodStart: new Date(new Date().setDate(1)), // First day of current month
        periodEnd: new Date() // Today
      });
      
      const payrollResult: ServerPayrollResponse[] = data;
      setCalculatedPayrollData(payrollResult);
      
      if (payrollResult && payrollResult.length > 0) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'system',
          content: `✅ Payroll calculation complete! Generated payroll for ${payrollResult.length} employees.`,
          timestamp: new Date(),
          actions: [
            {
              id: 'download-payroll',
              label: 'Download Payroll (Excel)',
              action: handleDownloadPayrollData
            }
          ]
        }]);
        toast.success(`Payroll calculated for ${payrollResult.length} employees.`);
      } else {
        toast.warning('No employee data found for payroll calculation.');
      }
      
    } catch (error: any) {
      console.error("Error calculating payroll:", error);
      const errorMessage = error.message || 'Unknown error during payroll calculation.';
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'error',
        content: `Payroll calculation failed: ${errorMessage}`,
        timestamp: new Date()
      }]);
      toast.error(`Payroll calculation failed: ${errorMessage}`);
    } finally {
       setIsLoading(false); 
    }
  };
  
  const handleDownloadPayrollData = () => {
    if (!calculatedPayrollData || calculatedPayrollData.length === 0) {
      toast.warning('No payroll data available to download.');
      return;
    }

    try {
      const ws = XLSX.utils.json_to_sheet(calculatedPayrollData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Payroll Data");

      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `payroll_export_${timestamp}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success('Payroll data downloaded successfully.');

    } catch (error) {
       console.error("Error downloading payroll data:", error);
       toast.error('Failed to download payroll data.');
    }
  };

  const handleCellEdit = (rowId: string, column: string, value: any) => {
    const fieldName = getFieldName(column);
    setEditingCell({ rowId, column, value, fieldName });
  };
  
  const handleCellSave = () => {
    if (!editingCell || !currentData) return;
    
    const { rowId, column, value, fieldName } = editingCell;
    
    if (!fieldName) {
        console.error("Cannot save cell edit: fieldName is undefined for column", column);
        toast.error(`Failed to save edit for column: ${column}`);
        setEditingCell(null);
        return;
    }
    
    const updatedData = {
      ...currentData,
      extractedData: currentData.extractedData.map(row => {
        if (row.id === rowId) {
          return { ...row, [fieldName]: value };
        }
        return row;
      })
    };
    
    setCurrentData(updatedData);
    setEditingCell(null);
    
    setMessages(prev => prev.map(msg => {
      if (msg.fileData && msg.type === 'file') {
        return { ...msg, fileData: updatedData };
      }
      return msg;
    }));
    
    toast.success(`Updated ${column} value`);
  };
  
  const handleCellEditCancel = () => {
    setEditingCell(null);
  };
  
  const handleConfirmAction = (confirm: boolean, message: Message) => {
    if (confirm && message.confirmAction) {
      message.confirmAction();
    } else if (!confirm && message.cancelAction) {
      message.cancelAction();
    }
  };

  const getFieldName = (displayHeader: string): keyof InsertEmployee | undefined => {
    const mapping: Record<string, keyof InsertEmployee> = {
      'Emp No': 'employeeNumber',
      'First Name': 'other_names',
      'Last Name': 'surname',
      'ID Number': 'id_no',
      'NSSF No': 'nssf_no',
      'KRA Pin': 'tax_pin',
      'NHIF No': 'nhif_no',
      'Position': 'position',
      'Gross Pay': 'gross_income',
      'Employer Advance': 'employer_advances',
      'Loan Deduction': 'loan_deductions',
      'Net Pay': 'net_income',
    };
    return mapping[displayHeader];
  };

  const getRowValue = (row: InsertEmployee, header: string): any => {
    switch (header) {
      case 'Emp No': return row.employeeNumber;
      case 'First Name': return row.other_names;
      case 'Last Name': return row.surname;
      case 'ID Number': return row.id_no;
      case 'NSSF No': return row.nssf_no;
      case 'KRA Pin': return row.tax_pin;
      case 'NHIF No': return row.nhif_no;
      case 'Position': return row.position;
      case 'Gross Pay': return row.gross_income;
      case 'Employer Advance': return row.employer_advances;
      case 'Loan Deduction': return row.loan_deductions;
      case 'Net Pay': return row.net_income;
      case 'PAYE': return row.statutory_deductions?.tax;
      case 'NSSF': return row.statutory_deductions?.nssf;
      case 'NHIF': return row.statutory_deductions?.nhif;
      case 'Levy': return row.statutory_deductions?.levy;
      default: return '';
    }
  };

  const handleDownload = () => {
    if (!currentData) return;
    
    try {
      downloadTransformedData(currentData.extractedData, 'processed_data.xlsx');
      toast.success('Successfully downloaded processed data');
    } catch (error) {
      console.error('Error downloading data:', error);
      toast.error('Failed to download data');
    }
  };
  
  const handleDownloadFailedRows = () => {
    if (!currentData || !currentData.failedRows.length) return;
    
    try {
      const ws = XLSX.utils.json_to_sheet(currentData.failedRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Failed Rows");
      
      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `failed_rows_${timestamp}.xlsx`);
      
      toast.success('Successfully downloaded failed rows');
    } catch (error) {
      console.error('Error downloading failed rows:', error);
      toast.error('Failed to download failed rows');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">HR Data Assistant</h1>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              {theme === "dark" ? (
                <Moon className="h-[1.2rem] w-[1.2rem] rotate-90 transition-all" />
              ) : (
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 transition-all" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              <span>Light</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Laptop className="mr-2 h-4 w-4" />
              <span>System</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="flex flex-col gap-4 h-full bg-background rounded-lg border">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'employee' && message.employeeData ? (
                  <div className="max-w-[85%]">
                    <EmployeeCard employee={message.employeeData} />
                  </div>
                ) : (
                  <Card className={cn(
                    "max-w-[80%] overflow-hidden",
                    message.type === 'user' ? "bg-primary text-white" : 
                    message.type === 'error' ? "bg-destructive text-destructive-foreground" : 
                    message.type === 'file' ? "bg-muted" : 
                    message.type === 'confirm' ? "bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-800" :
                    message.type === 'extraction' ? "bg-accent text-accent-foreground" : 
                    "bg-primary text-white"
                  )}>
                    <CardContent className="p-3">
                      <div className="flex flex-col gap-2">
                        <div className="text-sm">
                          {message.type === 'file' && <FileSpreadsheet className="h-4 w-4 inline-block mr-2" />}
                          {message.type === 'error' && <AlertCircle className="h-4 w-4 inline-block mr-2" />}
                          {message.type === 'extraction' && <Info className="h-4 w-4 inline-block mr-2" />}
                          {message.type === 'confirm' && <AlertTriangle className="h-4 w-4 inline-block mr-2" />}
                          {message.content}
                          {message.type !== 'user' && (
                            <span className="text-xs block mt-1 opacity-60">
                              {formatRelativeTime(message.timestamp)}
                            </span>
                          )}
                        </div>
                        
                        {message.type === 'confirm' && (
                          <div className="flex gap-2 mt-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleConfirmAction(true, message)}
                            >
                              Confirm
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleConfirmAction(false, message)}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                        
                        {message.type === 'file' && message.fileData && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setShowPreview(true)}
                              className="text-xs"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              View & Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={handleDownload}
                              className="text-xs"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download Processed
                            </Button>
                            {message.fileData?.failedRows?.length > 0 && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={handleDownloadFailedRows}
                                className="text-xs"
                              >
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Download Failed ({message.fileData.failedRows.length})
                              </Button>
                            )}
                          </div>
                        )}
                        
                        {message.actions && message.actions.length > 0 && (
                          <ActionPills 
                            actions={message.actions}
                            onActionClick={(action) => handleActionClick(action)}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="px-4 py-3 border-t flex flex-wrap gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleQuickAction('batch-upload')}
            className="text-xs"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Batch Upload Employees
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleQuickAction('export-payroll')}
            className="text-xs"
          >
            <DollarSign className="h-3 w-3 mr-1" />
            Export Current Payroll
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleQuickAction('manage-employees')}
            className="text-xs"
          >
            <Users className="h-3 w-3 mr-1" />
            Manage Employees
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => setShowHelpDialog(true)}
            className="text-xs ml-auto"
          >
            <HelpCircle className="h-3 w-3 mr-1" />
            Help
          </Button>
        </div>
        
        <div className="p-4 border-t">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="Type a message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (searchResults.length === 1) {
                        // If there's exactly one search result, select it
                        const employee = searchResults[0];
                        setMessages(prev => [...prev, {
                          id: Date.now().toString(),
                          type: 'employee',
                          content: chatService.formatEmployeeInfo(employee),
                          timestamp: new Date(),
                          employeeData: employee
                        }]);
                        setInputMessage('');
                        setShowSearchPreview(false);
                      } else {
                        handleSendMessage();
                      }
                    }
                  }}
                  className="flex-1"
                />
                
                {/* Search Preview Dropdown */}
                {showSearchPreview && (
                  <div className="absolute z-50 w-full mt-1 bg-background rounded-md border shadow-lg">
                    {isSearching ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <span className="animate-spin inline-block mr-2">⌛</span>
                        Searching...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <ul className="py-1 max-h-64 overflow-y-auto">
                        {searchResults.map((employee) => (
                          <li
                            key={employee.id}
                            className="px-3 py-2 hover:bg-accent cursor-pointer flex items-center gap-2"
                            onClick={() => {
                              setMessages(prev => [...prev, {
                                id: Date.now().toString(),
                                type: 'employee',
                                content: chatService.formatEmployeeInfo(employee),
                                timestamp: new Date(),
                                employeeData: employee
                              }]);
                              setInputMessage('');
                              setShowSearchPreview(false);
                            }}
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{`${employee.other_names} ${employee.surname}`}</p>
                              <p className="text-sm text-muted-foreground">
                                {employee.position} • #{employee.employeeNumber}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : debouncedSearchTerm ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No employees found
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleUploadClick}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button 
                type="submit" 
                size="icon"
                onClick={handleSendMessage}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Data Preview & Edit</DialogTitle>
            <DialogDescription>
              {currentData && (
                <div className="flex justify-between items-center">
                  <span>
                    Showing {currentData.extractedData.length} extracted rows from {currentData.fileName}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Processed
                    </Button>
                    <Button size="sm" variant="default" onClick={handleImportEmployees}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Import Employees
                    </Button>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {currentData && currentData.extractedData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {TARGET_HEADERS.map((header) => (
                        <TableHead key={header} className="whitespace-nowrap">{header}</TableHead>
                      ))}
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.extractedData.map((row) => (
                      <TableRow key={row.id ?? Math.random()}>
                        {TARGET_HEADERS.map((header) => {
                          const fieldName = getFieldName(header);
                          const cellValue = getRowValue(row, header);
                          
                          return (
                            <TableCell key={`${row.id ?? 'new'}-${header}`} className="py-2">
                              {editingCell && editingCell.rowId === row.id && editingCell.column === header ? (
                                <div className="flex gap-2">
                                  <Input 
                                    value={editingCell.value} 
                                    onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                    className="h-8 min-w-[100px]"
                                  />
                                  <Button size="sm" variant="ghost" onClick={handleCellSave} className="h-8 w-8 p-0" disabled={!fieldName}>
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={handleCellEditCancel} className="h-8 w-8 p-0">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between group">
                                  <span className="truncate max-w-[200px]">
                                    {cellValue !== undefined && cellValue !== null ?
                                      typeof cellValue === 'number' ?
                                        (header === 'Gross Pay' || header === 'Net Pay' || header === 'PAYE' || header === 'NSSF' || header === 'NHIF' || header === 'Levy' || header === 'Loan Deduction' || header === 'Employer Advance') ?
                                          formatKESCurrency(cellValue)
                                          : Number.isInteger(cellValue) ? 
                                            cellValue.toString() 
                                            : cellValue.toFixed(2) 
                                      : typeof cellValue === 'boolean' ?
                                        cellValue ? 'Yes' : 'No'
                                      : typeof cellValue === 'object' ?
                                        JSON.stringify(cellValue).substring(0, 30) + (JSON.stringify(cellValue).length > 30 ? '...' : '') 
                                      : cellValue.toString()
                                    : ''}
                                  </span>
                                  {fieldName && (
                                    <Button 
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleCellEdit(row.id!, header, cellValue ?? '')}
                                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          <Badge variant={'outline'}>Valid</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No data available.
                </div>
              )}
            </ScrollArea>
          </div>
          
          {currentData && currentData.failedRows.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium">Failed Extractions ({currentData.failedRows.length} rows)</h3>
              <p className="text-sm text-muted-foreground mb-2">
                These rows couldn't be processed correctly. You can download them for further investigation.
              </p>
              <Button size="sm" variant="outline" onClick={handleDownloadFailedRows}>
                <Download className="h-4 w-4 mr-2" />
                Download Failed Rows
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <HelpDialog 
        open={showHelpDialog}
        onOpenChange={setShowHelpDialog}
      />
    </div>
  );
};

export default ChatInterface;
