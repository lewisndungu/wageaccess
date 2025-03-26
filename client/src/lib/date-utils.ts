/**
 * Format a date string or Date object to a human-readable format
 * @param dateInput Date string or Date object
 * @returns Formatted date string (e.g., "Jan 1, 2023")
 */
export function formatDate(dateInput: string | Date): string {
  if (!dateInput) return '';
  
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a time string or Date object to a human-readable format
 * @param timeInput Time string or Date object
 * @returns Formatted time string (e.g., "9:30 AM")
 */
export function formatTime(timeInput: string | Date): string {
  if (!timeInput) return '';
  
  const date = typeof timeInput === 'string' ? new Date(timeInput) : timeInput;
  
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format a date and time string or Date object to a human-readable format
 * @param dateTimeInput Date/time string or Date object
 * @returns Formatted date and time string (e.g., "Jan 1, 2023, 9:30 AM")
 */
export function formatDateTime(dateTimeInput: string | Date): string {
  if (!dateTimeInput) return '';
  
  const date = typeof dateTimeInput === 'string' ? new Date(dateTimeInput) : dateTimeInput;
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get the current pay period (start and end dates)
 */
export function getCurrentPayPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
} 