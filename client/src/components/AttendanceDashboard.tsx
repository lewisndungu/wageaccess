import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Employee } from '@shared/schema';
import axios from 'axios';

// Define the interface for attendance records
interface AttendanceRecord {
  id: number;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  status: string;
  hoursWorked: string;
}

const AttendanceDashboard: React.FC = () => {
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewType, setViewType] = useState<string>('daily');
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Get today's date for default query
  const today = new Date();
  const todayFormatted = today.toISOString().split('T')[0];
  
  const { data: recordsData, isPending: isLoadingRecords, error: recordsError } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance', startDate || todayFormatted, endDate || todayFormatted, viewType],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('startDate', startDate || todayFormatted);
      params.append('endDate', endDate || todayFormatted);
      if (viewType) params.append('viewType', viewType);
      
      // Add debug logs
      const debugMsg = `Fetching attendance data with params: ${params.toString()}`;
      console.log(debugMsg);
      setDebugInfo(prev => prev + '\n' + debugMsg);
      
      try {
        const response = await axios.get(`/api/attendance?${params.toString()}`);
        
        const successMsg = `Received ${response.data?.length || 0} attendance records`;
        console.log(successMsg, response.data);
        setDebugInfo(prev => prev + '\n' + successMsg);
        return response.data;
      } catch (error: any) {
        const errorMsg = `Error fetching attendance data: ${error.message || error}`;
        console.error(errorMsg);
        setDebugInfo(prev => prev + '\n' + errorMsg);
        return [];
      }
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 60000, // Data stays fresh for 1 minute
  });

  // Log errors for debugging
  useEffect(() => {
    if (recordsError) {
      console.error('Records query error:', recordsError);
      setDebugInfo(prev => prev + '\n' + `Records error: ${recordsError}`);
    }
  }, [recordsError]);

  // Use a secure fallback for records data
  const displayRecords = recordsData || [];
  
  // Log what's being displayed
  console.log(`Displaying ${displayRecords.length} attendance records`);
  
  // Compute metrics based on display records
  const totalRecords = displayRecords.length;
  const onTimeCount = displayRecords.filter(record => record.status === 'on-time').length;
  const lateCount = displayRecords.filter(record => record.status === 'late').length;
  const absentCount = displayRecords.filter(record => record.status === 'absent').length;

  // Handler for date changes
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, isStart: boolean) => {
    if (isStart) {
      setStartDate(e.target.value);
    } else {
      setEndDate(e.target.value);
    }
  };

  return (
    <div className="p-4">
      {/* Dashboard content goes here */}
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-semibold">Attendance Dashboard</h1>
        
        {/* Date controls */}
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Start Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => handleDateChange(e, true)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">End Date</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => handleDateChange(e, false)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div className="self-end">
            <button 
              className="px-4 py-1 bg-blue-600 text-white rounded"
              onClick={() => {
                // Force refetch with current dates
                const key = ['/api/attendance', startDate || todayFormatted, endDate || todayFormatted, viewType];
                const queryClient = (window as any)._queryClient;
                if (queryClient) {
                  queryClient.invalidateQueries({queryKey: key});
                }
              }}
            >
              Apply
            </button>
          </div>
        </div>
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
            {displayRecords.length > 0 ? (
              displayRecords.map((record) => (
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
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No attendance records found for this period. Select different dates or try again later.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Debug panel - Only visible in development mode */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-6 p-4 bg-gray-800 text-white rounded-lg overflow-auto max-h-[300px]">
          <h3 className="text-lg font-semibold mb-2">Debug Info</h3>
          <pre className="text-xs whitespace-pre-wrap">{debugInfo}</pre>
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard; 