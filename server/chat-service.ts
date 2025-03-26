import * as storage from './storage';
import { formatKEDate, formatKESCurrency } from '../client/src/lib/format-utils';
import { calculatePayrollBasedOnAttendance } from '../client/src/lib/kenyan-payroll';
import { processFile as processSpreadsheet } from '../client/src/lib/spreadsheet-processor';

export interface ChatMessage {
  id: string;
  userId: string;
  type: string;
  content: string;
  timestamp: Date;
  fileData?: any;
  employeeData?: any;
  actions?: ChatAction[];
  metadata?: any;
}

export interface ChatAction {
  id: string;
  label: string;
  icon?: string;
}

export interface ChatHistory {
  userId: string;
  messages: ChatMessage[];
  commands: string[];
  searches: string[];
}

export function createChatService() {
  return {
    async processMessage(message: string, userId: string): Promise<ChatMessage> {
      // Save the command to history
      await storage.saveCommand(userId, message);
      
      const lowerMessage = message.toLowerCase();
      let response: ChatMessage = {
        id: Date.now().toString(),
        userId,
        type: 'system',
        content: 'I processed your message',
        timestamp: new Date()
      };
      
      // Basic message processing logic, similar to the client-side implementation
      if (lowerMessage.includes('find employee') || lowerMessage.includes('search for') || lowerMessage.includes('look up')) {
        const searchTerms = message.match(/(?:find|search for|look up)(?:\s+employee)?\s+(.+)/i);
        
        if (searchTerms && searchTerms[1]) {
          const query = searchTerms[1].trim();
          await storage.saveSearch(userId, query);
          
          // Implement employee search logic here
          const employees = await storage.findEmployees({ query });
          
          if (employees.length > 0) {
            response = {
              id: Date.now().toString(),
              userId,
              type: 'system',
              content: `I found ${employees.length} employee(s) matching "${query}":`,
              timestamp: new Date(),
              actions: [
                {
                  id: 'view-all-employees',
                  label: 'View All Employees'
                },
                {
                  id: 'add-employee',
                  label: 'Add New Employee'
                }
              ]
            };
            
            // Additional logic to format and return employee data
          } else {
            response = {
              id: Date.now().toString(),
              userId,
              type: 'system',
              content: `I couldn't find any employees matching "${query}". Please try a different name or ID.`,
              timestamp: new Date(),
              actions: [
                {
                  id: 'upload-employees',
                  label: 'Upload Employee Data'
                },
                {
                  id: 'add-employee',
                  label: 'Add New Employee'
                }
              ]
            };
          }
        }
      }
      // Handle other message types (similar to client-side implementation)
      else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
        response = {
          id: Date.now().toString(),
          userId,
          type: 'system',
          content: `I can help you with the following tasks:
            
1. **Process Employee Data**: Upload spreadsheets with employee information
2. **Batch Upload Employees**: Add multiple employees from a spreadsheet
3. **Export Payroll**: Generate and download payroll data with Kenyan tax calculations
4. **Manage Employees**: Find, update, or query employee information
5. **Calculate Taxes**: Compute PAYE, NHIF, NSSF, and Housing Levy according to KRA regulations

You can also use the quick action buttons below the chat to access common functions.`,
          timestamp: new Date(),
          actions: [
            {
              id: 'find-employee',
              label: 'Find Employee'
            },
            {
              id: 'upload-data',
              label: 'Upload Data'
            },
            {
              id: 'calculate-payroll',
              label: 'Calculate Payroll'
            }
          ]
        };
      }
      
      // Save the message
      await storage.saveMessage({
        id: Date.now().toString(),
        userId,
        type: 'user',
        content: message,
        timestamp: new Date()
      });
      
      // Save the response
      const savedResponse = await storage.saveMessage(response);
      
      return savedResponse;
    },
    
    async getHistory(userId: string): Promise<ChatHistory> {
      const history = await storage.getUserChatHistory(userId);
      if (!history) {
        return {
          userId,
          messages: [],
          commands: [],
          searches: []
        };
      }
      
      // Get the most recent messages
      const messages = await storage.getMessagesByUser(userId);
      
      return {
        ...history,
        messages
      };
    },
    
    async processFile(file: Express.Multer.File, userId: string): Promise<any> {
      // Implement file processing logic, similar to the client-side implementation
      try {
        const result = await processSpreadsheet(file);
        
        // Save a message about the file upload
        const fileMessage: ChatMessage = {
          id: Date.now().toString(),
          userId,
          type: 'file',
          content: `Uploaded: ${file.originalname}`,
          timestamp: new Date(),
          fileData: result,
          actions: [
            {
              id: 'view-data',
              label: 'View & Edit'
            },
            {
              id: 'import-data',
              label: 'Import Employees'
            }
          ]
        };
        
        await storage.saveMessage(fileMessage);
        
        return result;
      } catch (error) {
        console.error('Error processing file:', error);
        throw new Error(`Failed to process file: ${error.message}`);
      }
    },
    
    async searchEmployee(query: string, userId: string): Promise<any[]> {
      // Save the search query
      await storage.saveSearch(userId, query);
      
      // Implement employee search logic
      const employees = await storage.findEmployees({ query });
      
      return employees;
    },
    
    async importEmployees(data: any[], userId: string): Promise<any> {
      // Implement employee import logic
      const addedEmployees = await storage.addEmployees(data);
      
      // Save a message about the import
      const importMessage: ChatMessage = {
        id: Date.now().toString(),
        userId,
        type: 'system',
        content: `✅ Successfully imported ${data.length} employees.`,
        timestamp: new Date()
      };
      
      await storage.saveMessage(importMessage);
      
      return { success: true, count: data.length };
    },
    
    async calculatePayroll(employeeIds: string[], userId: string): Promise<any> {
      // Implement payroll calculation logic
      const employees = await storage.getEmployees(employeeIds);
      
      const payrollData = employees.map(employee => {
        const grossPay = employee.salary || 0;
        if (grossPay <= 0) return null;
        
        // Mock attendance data
        const standardHours = 160;
        const workedHours = Math.floor(Math.random() * 40) + 130;
        
        const payrollCalculation = calculatePayrollBasedOnAttendance(
          grossPay,
          standardHours,
          workedHours
        );
        
        return {
          'Employee ID': employee.id || 'N/A',
          'Name': employee.name || 'Unknown',
          'Position': employee.position || 'N/A',
          'Standard Hours': standardHours,
          'Worked Hours': workedHours,
          'Gross Pay': grossPay,
          'Taxable Pay': payrollCalculation.taxablePay,
          'PAYE': payrollCalculation.paye,
          'NHIF': payrollCalculation.nhif,
          'NSSF': payrollCalculation.nssf,
          'Housing Levy': payrollCalculation.housingLevy,
          'Total Deductions': payrollCalculation.totalDeductions,
          'Net Pay': payrollCalculation.netPay
        };
      }).filter(Boolean);
      
      // Save a message about the payroll calculation
      const payrollMessage: ChatMessage = {
        id: Date.now().toString(),
        userId,
        type: 'system',
        content: `✅ Payroll calculation complete! Generated payroll for ${payrollData.length} employees.`,
        timestamp: new Date()
      };
      
      await storage.saveMessage(payrollMessage);
      
      return payrollData;
    },
    
    // Format employee data for display in chat
    formatEmployeeInfo(employee: any): string {
      return `
**${employee.name}**
Position: ${employee.position}
Department: ${employee.department}
Hire Date: ${formatKEDate(employee.hireDate)}
Salary: ${formatKESCurrency(employee.salary)}
      `.trim();
    }
  };
} 