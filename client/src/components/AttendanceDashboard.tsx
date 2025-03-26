import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Employee } from '../types/employee';

// Define the interface for attendance records
interface AttendanceRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  department: string;
  date: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  status: string;
  hoursWorked: string;
}

const AttendanceDashboard: React.FC = () => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [viewType, setViewType] = useState<string>('daily');

  const { data: recordsData, isLoading: isLoadingRecords } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance', startDate, endDate, viewType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (viewType) params.append('viewType', viewType);
      
      const response = await fetch(`/api/attendance?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch attendance records');
      return await response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000, // Data stays fresh for 5 seconds
    placeholderData: [], // Use empty array as placeholder until real data loads
  });

  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
    queryFn: async () => {
      const response = await fetch('/api/employees');
      if (!response.ok) throw new Error('Failed to fetch employees');
      return await response.json();
    },
  });

  // If either records or employees are loading, show loading state
  if (isLoadingRecords || isLoadingEmployees) {
    return (
      <div className="p-4">
        <div className="flex justify-between mb-4">
          <h1 className="text-xl font-semibold">Attendance Dashboard</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-2"></div>
            <p className="text-gray-600">Loading attendance data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Use a secure fallback for records data
  const displayRecords = recordsData || [];
  
  // Compute metrics based on display records
  const totalRecords = displayRecords.length;
  const onTimeCount = displayRecords.filter(record => record.status === 'on-time').length;
  const lateCount = displayRecords.filter(record => record.status === 'late').length;
  const absentCount = displayRecords.filter(record => record.status === 'absent').length;

  return (
    <div className="p-4">
      {/* Dashboard content goes here */}
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-semibold">Attendance Dashboard</h1>
        {/* Filter controls would go here */}
      </div>
      
      {/* Statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500">Total Records</h3>
          <p className="text-2xl font-bold">{totalRecords}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500">On Time</h3>
          <p className="text-2xl font-bold text-green-600">{onTimeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500">Late</h3>
          <p className="text-2xl font-bold text-yellow-500">{lateCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500">Absent</h3>
          <p className="text-2xl font-bold text-red-500">{absentCount}</p>
        </div>
      </div>
      
      {/* Attendance records table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayRecords.map((record) => (
              <tr key={record.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{record.employeeName}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{record.department}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{record.date}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{record.clockInTime || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{record.clockOutTime || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${record.status === 'on-time' ? 'bg-green-100 text-green-800' : 
                      record.status === 'late' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'}`}>
                    {record.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {record.hoursWorked}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceDashboard; 