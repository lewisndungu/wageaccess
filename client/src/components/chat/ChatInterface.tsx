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
import { useEmployeeStore, Employee as StoreEmployee, Advance as StoreAdvance } from '@/lib/store';
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

type ExtractedRow = Record<string, any> & {
  id: string;
  extractionErrors?: string[];
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

const TARGET_HEADERS = [
  'Emp No', 'First Name', 'Last Name', 'ID Number', 'KRA Pin', 
  'NSSF No', 'Position', 'Gross Pay', 'PAYE', 'NSSF', 
  'NHIF', 'Levy', 'Loan Deduction', 'Employer Advance'
];

// Local storage for employees is now handled by chatService

const employeeStorage = {
  employees: [] as ExtractedRow[],
  addEmployees: function(employees: ExtractedRow[]) {
    employees.forEach(employee => {
      const existingIndex = this.employees.findIndex(e => 
        (e['ID Number'] && employee['ID Number'] && e['ID Number'] === employee['ID Number']) ||
        (e['Emp No'] && employee['Emp No'] && e['Emp No'] === employee['Emp No'])
      );
      
      if (existingIndex >= 0) {
        this.employees[existingIndex] = { ...this.employees[existingIndex], ...employee };
      } else {
        this.employees.push(employee);
      }
    });
    
    return this.employees.length;
  },
  getEmployees: function() {
    return [...this.employees];
  },
  findEmployee: function(query: string) {
    const lowerQuery = query.toLowerCase();
    return this.employees.filter(emp => 
      (emp['First Name'] && emp['First Name'].toLowerCase().includes(lowerQuery)) ||
      (emp['Last Name'] && emp['Last Name'].toLowerCase().includes(lowerQuery)) ||
      (emp['fullName'] && emp['fullName'].toLowerCase().includes(lowerQuery)) ||
      (emp['ID Number'] && emp['ID Number'].toString().includes(lowerQuery)) ||
      (emp['Emp No'] && emp['Emp No'].toString().includes(lowerQuery))
    );
  },
  updateEmployee: function(id: string, updates: Partial<ExtractedRow>) {
    const index = this.employees.findIndex(e => e.id === id);
    if (index >= 0) {
      this.employees[index] = { ...this.employees[index], ...updates };
      return true;
    }
    return false;
  }
};

const mockAttendanceData = {
  getAttendance: function(employeeId: string) {
    const standardHours = 160;
    const workedHours = Math.floor(Math.random() * 40) + 130;
    
    return {
      employeeId,
      standardHours,
      workedHours,
      present: Math.floor(workedHours / 8),
      absent: Math.floor((standardHours - workedHours) / 8),
      late: Math.floor(Math.random() * 5)
    };
  }
};

const ChatInterface: React.FC = () => {
  // Load saved messages from local storage
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [currentData, setCurrentData] = useState<ProcessedData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editingCell, setEditingCell] = useState<{rowId: string, column: string, value: any} | null>(null);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const addEmployeesToStore = useEmployeeStore((state) => state.addEmployees);
  const allEmployees = useEmployeeStore((state) => state.employees);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  
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
          action: () => handleActionClick(action.id, action)
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
  
  const handleActionClick = (actionId: string, action: any) => {
    switch (actionId) {
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
        processUserMessage('Calculate payroll for all employees');
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
      // Add more action handlers as needed
      default:
        if (action.action && typeof action.action === 'function') {
          action.action();
        }
        break;
    }
  };
  
  const processUserMessage = async (message: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Process message on server
      const response = await chatService.processMessage(message);
      
      // Add server response with client-side action handlers
      const processedResponse = {
        ...response,
        actions: response.actions?.map(action => ({
          ...action,
          action: () => handleActionClick(action.id, action)
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
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'batch-upload':
        fileInputRef.current?.click();
        break;
      case 'export-payroll':
        processUserMessage('Calculate payroll for all employees');
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
      
      // Use chatService to upload and process file
      const result = await chatService.uploadFile(file);
      
      // Update UI with result
      const processedData: ProcessedData = result;
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
      
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(`Failed to process the spreadsheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'error',
          content: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
  
  const handleImportEmployees = async () => {
    if (!currentData || !currentData.extractedData.length) return;
    
    const confirmAction = async () => {
      try {
        // Use API to import employees
        await chatService.importEmployees(currentData.extractedData);
        
        // Transform and add imported employees to the Employees component store
        const transformedEmployees = currentData.extractedData.map((emp): StoreEmployee => {
          const fullName = emp['fullName'] || `${emp['First Name'] || ''} ${emp['Last Name'] || ''}`;
          return {
            id: emp.id || `emp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: fullName.trim(),
            email: emp['Email'] || emp['email'] || `${fullName.toLowerCase().replace(/\s+/g, '.')}@company.com`,
            phone: emp['Phone'] || emp['phone'] || emp['Contact'] || '(000) 000-0000',
            position: emp['Position'] || emp['Job Title'] || emp['Designation'] || 'Employee',
            department: emp['Department'] || 'General',
            hireDate: emp['Hire Date'] || emp['Start Date'] || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            salary: parseFloat(emp['Gross Pay']) || parseFloat(emp['Salary']) || 0,
            address: emp['Address'] || 'No address provided',
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
        addEmployeesToStore(transformedEmployees);
        
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
              action: () => processUserMessage('Calculate payroll for all employees')
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

  const displayHeaders = currentData?.headers || TARGET_HEADERS;
  
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
                    message.type === 'user' ? "bg-primary text-primary-foreground" : 
                    message.type === 'error' ? "bg-destructive text-destructive-foreground" : 
                    message.type === 'file' ? "bg-muted" : 
                    message.type === 'confirm' ? "bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-800" :
                    message.type === 'extraction' ? "bg-accent text-accent-foreground" : 
                    "bg-secondary"
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
                            {message.fileData.failedRows.length > 0 && (
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
                            onActionClick={handleActionClick}
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
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
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
                      {displayHeaders.map((header) => (
                        <TableHead key={header} className="whitespace-nowrap">{header}</TableHead>
                      ))}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.extractedData.map((row) => (
                      <TableRow key={row.id}>
                        {displayHeaders.map((header) => (
                          <TableCell key={`${row.id}-${header}`} className="py-2">
                            {editingCell && editingCell.rowId === row.id && editingCell.column === header ? (
                              <div className="flex gap-2">
                                <Input 
                                  value={editingCell.value} 
                                  onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                  className="h-8 min-w-[100px]"
                                />
                                <Button size="sm" variant="ghost" onClick={handleCellSave} className="h-8 w-8 p-0">
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={handleCellEditCancel} className="h-8 w-8 p-0">
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between group">
                                <span className="truncate max-w-[200px]">
                                  {row[header] !== undefined ? row[header].toString() : ''}
                                </span>
                                <Button 
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCellEdit(row.id, header, row[header] || '')}
                                  className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={row.extractionErrors?.length ? 'destructive' : 'outline'}>
                              {row.extractionErrors?.length ? `${row.extractionErrors.length} issues` : 'Valid'}
                            </Badge>
                          </div>
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
