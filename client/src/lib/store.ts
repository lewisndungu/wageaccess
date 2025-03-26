
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  hireDate: string;
  salary: number;
  address: string;
  avatar?: string;
  advances: Advance[];
  attendance: {
    present: number;
    absent: number;
    late: number;
    total: number;
  };
}

export interface Advance {
  id: string;
  amount: number;
  date: string;
  status: 'approved' | 'pending' | 'rejected';
  repaid: boolean;
}

interface EmployeeStore {
  employees: Employee[];
  addEmployee: (employee: Employee) => void;
  addEmployees: (employees: Employee[]) => void;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  getEmployee: (id: string) => Employee | undefined;
}

export const useEmployeeStore = create<EmployeeStore>()(
  persist(
    (set, get) => ({
      employees: [],
      addEmployee: (employee) => {
        set((state) => ({
          employees: [...state.employees, employee],
        }));
      },
      addEmployees: (newEmployees) => {
        set((state) => {
          // Map to ensure we don't have duplicates based on id
          const employeeMap = new Map(state.employees.map(emp => [emp.id, emp]));
          
          // Add or update with new employees
          newEmployees.forEach(emp => {
            employeeMap.set(emp.id, emp);
          });
          
          return {
            employees: Array.from(employeeMap.values()),
          };
        });
      },
      updateEmployee: (id, data) => {
        set((state) => ({
          employees: state.employees.map((employee) =>
            employee.id === id ? { ...employee, ...data } : employee
          ),
        }));
      },
      getEmployee: (id) => {
        return get().employees.find((employee) => employee.id === id);
      },
    }),
    {
      name: 'employee-storage',
    }
  )
);
