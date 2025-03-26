export interface Employee {
  id: number;
  employeeNumber: string;
  name: string;
  email: string;
  department: string;
  position: string;
  status: "active" | "inactive";
  profileImage?: string;
  hourlyRate: number;
  startDate: string;
  active: boolean;
  phoneNumber: string;
  emergencyContact: string;
  address: string;
}

// For components that only need basic employee info
export interface BasicEmployee {
  id: number;
  employeeNumber: string;
  name: string;
  department: string;
  position: string;
  email: string;
  status: "active" | "inactive";
  profileImage?: string;
  phoneNumber?: string;
} 