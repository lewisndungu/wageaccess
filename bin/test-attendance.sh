#!/bin/bash

# Test script for attendance API endpoints
# -------------------------------------------------

# Define the base URL
API_URL="http://localhost:3000/api"

# Set up text colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print section headers
print_header() {
  echo -e "\n${BLUE}===== $1 =====${NC}\n"
}

# Function to make API calls and print responses
api_call() {
  local method=$1
  local endpoint=$2
  local data=$3
  local desc=$4

  echo -e "${GREEN}>> $desc${NC}"
  echo -e "   ${method} ${endpoint}"
  
  if [ -n "$data" ]; then
    echo -e "   Data: $data"
    response=$(curl -s -X "${method}" "${API_URL}${endpoint}" \
      -H "Content-Type: application/json" \
      -d "${data}")
  else
    response=$(curl -s -X "${method}" "${API_URL}${endpoint}" \
      -H "Content-Type: application/json")
  fi
  
  echo -e "   ${GREEN}Response:${NC} ${response}\n"
  
  # Sleep briefly between API calls
  sleep 1
}

# Reset attendance data (optional)
print_header "Reset Attendance Data"
api_call "POST" "/dev/mock-control" '{"action": "reset-attendance"}' "Reset all attendance records"

# Get active employees
print_header "Get Employees"
api_call "GET" "/employees/active" "" "Fetch active employees to get their IDs"

# Read employee ID from user
read -p "Enter an employee ID from the list above: " EMPLOYEE_ID

if [ -z "$EMPLOYEE_ID" ]; then
  echo -e "${RED}No employee ID provided. Using default ID 1.${NC}"
  EMPLOYEE_ID=1
fi

# Clock in for an employee
print_header "Clock In"
api_call "POST" "/attendance/clock" "{\"employeeId\": ${EMPLOYEE_ID}, \"action\": \"clockIn\", \"location\": {\"latitude\": 1.2345, \"longitude\": 6.7890}}" "Clock in for employee ${EMPLOYEE_ID}"

# Get attendance records for the employee
print_header "Get Attendance Records"
api_call "GET" "/attendance/employee/${EMPLOYEE_ID}" "" "Get attendance records for employee ${EMPLOYEE_ID}"

# Optional: Clock out after some time
print_header "Clock Out"
read -p "Press Enter to clock out..." 
api_call "POST" "/attendance/clock" "{\"employeeId\": ${EMPLOYEE_ID}, \"action\": \"clockOut\", \"location\": {\"latitude\": 1.2345, \"longitude\": 6.7890}}" "Clock out for employee ${EMPLOYEE_ID}"

# Get updated attendance records
print_header "Get Updated Attendance Records"
api_call "GET" "/attendance/employee/${EMPLOYEE_ID}" "" "Get updated attendance records for employee ${EMPLOYEE_ID}"

echo -e "\n${GREEN}Test completed!${NC}" 