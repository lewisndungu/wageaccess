import React from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Phone, Building, Briefcase, Calendar, Banknote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatKESCurrency, formatKEDate } from '@/lib/format-utils';
import type { Employee } from '@shared/schema';

interface EmployeeCardProps {
  employee: Employee;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee }) => {
  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base">{`${employee.other_names} ${employee.surname}`}</h3>
              <p className="text-sm text-muted-foreground">{employee.position}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>{employee.position}</span>
            </div>

            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              <span>{formatKESCurrency(employee.gross_income)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Hired: {formatKEDate(employee.created_at)}</span>
            </div>
            
            {employee.contact?.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{employee.contact.email}</span>
              </div>
            )}
            
            {employee.contact?.phoneNumber && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{employee.contact.phoneNumber}</span>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" asChild>
              <Link to={`/employees?id=${employee.id}`}>View Details</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to={`/earned-wage?employee=${employee.id}`}>Advances</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeCard;
