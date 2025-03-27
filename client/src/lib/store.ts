import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Employee } from '@shared/schema';

export interface Advance {
  id: string;
  employeeId: string;
  amount: number;
  date: string;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed';
  processingFee?: number;
}

export interface Attendance {
  present: number;
  absent: number;
  late: number;
  total: number;
}

interface EmployeeState {
  employees: Employee[];
  advances: Advance[];
  addEmployees: (employees: Employee[]) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  getEmployee: (id: string) => Employee | undefined;
  addAdvance: (employeeId: string, advance: Advance) => void;
  updateAdvance: (employeeId: string, advanceId: string, advance: Partial<Advance>) => void;
  getAdvances: (employeeId: string) => Advance[];
}

// Helper to convert server employee to client Employee format
export const convertServerEmployee = (serverEmployee: any): Employee => {
  return {
    id: serverEmployee.id.toString(),
    username: serverEmployee.username,
    password: serverEmployee.password,
    employeeNumber: serverEmployee.employeeNumber,
    userId: serverEmployee.userId,
    departmentId: serverEmployee.department ? serverEmployee.department.id || 0 : undefined,
    surname: serverEmployee.surname || '',
    other_names: serverEmployee.other_names || '',
    id_no: serverEmployee.id_no || '',
    tax_pin: serverEmployee.tax_pin || null,
    sex: serverEmployee.sex || '',
    position: serverEmployee.position || '',
    status: serverEmployee.status || 'active',
    is_on_probation: serverEmployee.is_on_probation || false,
    role: serverEmployee.role || 'employee',
    gross_income: typeof serverEmployee.gross_income === 'number' 
      ? serverEmployee.gross_income.toString() 
      : serverEmployee.gross_income || '0',
    net_income: serverEmployee.net_income || '0',
    total_deductions: serverEmployee.total_deductions || '0',
    loan_deductions: serverEmployee.loan_deductions || '0',
    employer_advances: serverEmployee.employer_advances || '0',
    total_loan_deductions: serverEmployee.total_loan_deductions || '0',
    statutory_deductions: serverEmployee.statutory_deductions || {
      nhif: 0,
      nssf: 0,
      paye: 0,
      levies: 0
    },
    max_salary_advance_limit: serverEmployee.max_salary_advance_limit || '0',
    available_salary_advance_limit: serverEmployee.available_salary_advance_limit || '0',
    last_withdrawal_time: serverEmployee.last_withdrawal_time || null,
    contact: {
      phoneNumber: serverEmployee.contact?.phoneNumber || '',
      email: serverEmployee.contact?.email || ''
    },
    address: serverEmployee.address || '',
    bank_info: {
      acc_no: serverEmployee.bank_info?.acc_no || null,
      bank_name: serverEmployee.bank_info?.bank_name || null
    },
    id_confirmed: serverEmployee.id_confirmed || false,
    mobile_confirmed: serverEmployee.mobile_confirmed || false,
    tax_pin_verified: serverEmployee.tax_pin_verified || false,
    country: serverEmployee.country || 'KE',
    documents: serverEmployee.documents || [],
    crb_reports: serverEmployee.crb_reports || [],
    avatar_url: serverEmployee.avatar_url || '',
    hourlyRate: typeof serverEmployee.hourlyRate === 'number' 
      ? serverEmployee.hourlyRate 
      : parseFloat(serverEmployee.hourlyRate) || 0,
    phoneNumber: serverEmployee.phoneNumber || null,
    startDate: serverEmployee.startDate || '',
    emergencyContact: serverEmployee.emergencyContact || null,
    active: serverEmployee.active || false,
    created_at: serverEmployee.created_at || new Date().toISOString(),
    modified_at: serverEmployee.modified_at || new Date().toISOString()
  };
};

export const useEmployeeStore = create<EmployeeState>()(
  persist(
    (set, get) => ({
      employees: [],
      advances: [],
      
      addEmployees: (employees) => {
        set((state) => {
          // Create a map of existing employees by ID for quick lookup
          const existingMap = new Map(state.employees.map(e => [e.id, e]));
          
          // Merge and add employees
          const updatedEmployees = [...state.employees];
          
          for (const emp of employees) {
            const existingIndex = updatedEmployees.findIndex(e => e.id === emp.id);
            
            if (existingIndex >= 0) {
              // Update existing employee
              updatedEmployees[existingIndex] = { ...updatedEmployees[existingIndex], ...emp };
            } else {
              // Add new employee
              updatedEmployees.push(emp);
            }
          }
          
          return { employees: updatedEmployees };
        });
      },
      
      updateEmployee: (id, employee) => {
        set((state) => ({
          employees: state.employees.map((e) =>
            e.id === id ? { ...e, ...employee } : e
          ),
        }));
      },
      
      deleteEmployee: (id) => {
        set((state) => ({
          employees: state.employees.filter((e) => e.id !== id),
          // Also remove any advances for this employee
          advances: state.advances.filter((a) => a.employeeId !== id)
        }));
      },
      
      getEmployee: (id) => {
        return get().employees.find((e) => e.id === id);
      },
      
      addAdvance: (employeeId, advance) => {
        set((state) => ({
          advances: [...state.advances, { ...advance, employeeId }]
        }));
      },
      
      updateAdvance: (employeeId, advanceId, advance) => {
        set((state) => ({
          advances: state.advances.map((a) =>
            a.id === advanceId && a.employeeId === employeeId
              ? { ...a, ...advance }
              : a
          )
        }));
      },

      getAdvances: (employeeId) => {
        return get().advances.filter((a) => a.employeeId === employeeId);
      }
    }),
    {
      name: 'employee-store',
    }
  )
);
