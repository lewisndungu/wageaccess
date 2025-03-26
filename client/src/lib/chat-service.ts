import { Employee } from "@/lib/store";
import { formatKEDate, formatKESCurrency } from "@/lib/format-utils";
import axios from 'axios';

export type MessageType = 'user' | 'system' | 'file' | 'extraction' | 'error' | 'confirm' | 'employee';

export interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  fileData?: any;
  employeeData?: Employee;
  confirmAction?: () => void;
  cancelAction?: () => void;
  actions?: ChatAction[];
}

export interface ChatAction {
  id: string;
  label: string;
  icon?: string;
  action: () => void;
}

// Common actions that can be suggested based on context
export const COMMON_ACTIONS = {
  UPLOAD_EMPLOYEES: {
    id: 'upload-employees',
    label: 'Upload Employee Data',
    icon: 'upload',
    action: () => {}  // Will be replaced with actual function
  },
  CALCULATE_PAYROLL: {
    id: 'calculate-payroll',
    label: 'Calculate Payroll',
    icon: 'calculator',
    action: () => {}
  },
  VIEW_EMPLOYEES: {
    id: 'view-employees',
    label: 'View Employees',
    icon: 'users',
    action: () => {}
  },
  CREATE_NEW_EMPLOYEE: {
    id: 'create-employee',
    label: 'Add New Employee',
    icon: 'user-plus',
    action: () => {}
  },
  EXPORT_DATA: {
    id: 'export-data',
    label: 'Export Data',
    icon: 'download',
    action: () => {}
  }
};

// Helper to convert API message to client Message format
const convertApiMessage = (apiMessage: any): Message => {
  return {
    ...apiMessage,
    timestamp: new Date(apiMessage.timestamp),
    // Convert actions to include action functions (will be set by consumer)
    actions: apiMessage.actions ? apiMessage.actions.map((action: any) => ({
      ...action,
      action: () => {} // Placeholder, will be set by consumer
    })) : undefined
  };
};

// Only store the last message in localStorage for offline experience
// Main history is stored on the server
const CURRENT_MESSAGE_KEY = 'hr-chat-current-message';

export const chatService = {
  // Get user ID (should be replaced with actual auth implementation)
  getUserId(): string {
    return localStorage.getItem('userId') || 'anonymous-user';
  },
  
  async getRecentMessages(): Promise<Message[]> {
    try {
      // Try to get messages from API first
      const userId = this.getUserId();
      const response = await axios.get(`/api/chat/history/${userId}`);
      
      if (response.data && response.data.messages) {
        return response.data.messages.map(convertApiMessage);
      }
      
      // Fallback to local storage if API fails
      const storedMessage = localStorage.getItem(CURRENT_MESSAGE_KEY);
      if (storedMessage) {
        const message = JSON.parse(storedMessage);
        return [convertApiMessage(message)];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching chat history:', error);
      
      // Fallback to local storage if API fails
      const storedMessage = localStorage.getItem(CURRENT_MESSAGE_KEY);
      if (storedMessage) {
        const message = JSON.parse(storedMessage);
        return [convertApiMessage(message)];
      }
      
      return [];
    }
  },
  
  async saveMessages(messages: Message[]): Promise<void> {
    // Only store the last message locally
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      localStorage.setItem(CURRENT_MESSAGE_KEY, JSON.stringify({
        ...lastMessage,
        timestamp: lastMessage.timestamp.toISOString()
      }));
    }
    
    // No need to save to API as that's handled by individual operations
  },
  
  async processMessage(message: string): Promise<Message> {
    try {
      const userId = this.getUserId();
      const response = await axios.post('/api/chat/message', { message, userId });
      
      return convertApiMessage(response.data);
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Fallback for offline mode
      return {
        id: Date.now().toString(),
        type: 'error',
        content: 'Unable to process your message. Please check your connection and try again.',
        timestamp: new Date()
      };
    }
  },
  
  async saveCommand(command: string): Promise<void> {
    try {
      const userId = this.getUserId();
      await axios.post('/api/chat/command', { command, userId });
    } catch (error) {
      console.error('Error saving command:', error);
      // Silently fail for commands
    }
  },
  
  async saveSearch(search: string): Promise<void> {
    try {
      const userId = this.getUserId();
      await axios.post('/api/chat/search', { search, userId });
    } catch (error) {
      console.error('Error saving search:', error);
      // Silently fail for searches
    }
  },
  
  async searchEmployee(query: string): Promise<any[]> {
    try {
      const userId = this.getUserId();
      const response = await axios.get('/api/chat/search-employee', {
        params: { query, userId }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error searching for employee:', error);
      return [];
    }
  },
  
  async uploadFile(file: File): Promise<any> {
    try {
      const userId = this.getUserId();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      
      const response = await axios.post('/api/chat/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },
  
  async importEmployees(data: any[]): Promise<any> {
    try {
      const userId = this.getUserId();
      const response = await axios.post('/api/chat/import-employees', {
        data,
        userId
      });
      
      return response.data;
    } catch (error) {
      console.error('Error importing employees:', error);
      throw error;
    }
  },
  
  async calculatePayroll(employeeIds: string[]): Promise<any> {
    try {
      const userId = this.getUserId();
      const response = await axios.post('/api/chat/calculate-payroll', {
        employeeIds,
        userId
      });
      
      return response.data;
    } catch (error) {
      console.error('Error calculating payroll:', error);
      throw error;
    }
  },
  
  clearHistory(): void {
    localStorage.removeItem(CURRENT_MESSAGE_KEY);
  },
  
  getRecentCommands(): string[] {
    return []; // Now handled by the server
  },
  
  getRecentSearches(): string[] {
    return []; // Now handled by the server
  },
  
  // Format employee data for display in chat
  formatEmployeeInfo(employee: Employee): string {
    return `
**${employee.name}**
Position: ${employee.position}
Department: ${employee.department}
Hire Date: ${formatKEDate(employee.hireDate)}
Salary: ${formatKESCurrency(employee.salary)}
    `.trim();
  },
  
  // Generate suggested actions based on context and user history
  getSuggestedActions(history: ChatHistory): ChatAction[] {
    const recentCommands = history.commands;
    const actions: ChatAction[] = [];
    
    // If user has been searching for employees but hasn't uploaded data
    if (history.lastSearches.length > 0 && !recentCommands.includes('upload')) {
      actions.push(COMMON_ACTIONS.UPLOAD_EMPLOYEES);
    }
    
    // If user has uploaded data but hasn't calculated payroll
    if (recentCommands.includes('upload') && !recentCommands.includes('payroll')) {
      actions.push(COMMON_ACTIONS.CALCULATE_PAYROLL);
    }
    
    // If user has been working with payroll, suggest exporting
    if (recentCommands.includes('payroll') && !recentCommands.includes('export')) {
      actions.push(COMMON_ACTIONS.EXPORT_DATA);
    }
    
    // Default actions if nothing specific to suggest
    if (actions.length === 0) {
      actions.push(COMMON_ACTIONS.VIEW_EMPLOYEES);
      actions.push(COMMON_ACTIONS.CREATE_NEW_EMPLOYEE);
    }
    
    return actions.slice(0, 3); // Limit to 3 suggestions
  }
};
