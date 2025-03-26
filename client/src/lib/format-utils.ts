/**
 * Format a number as currency (KES)
 * @param amount Number to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Format a KES currency value with only the currency symbol
 * @param amount Amount to format
 * @returns Formatted KES string
 */
export function formatKES(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `KES ${numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a percentage value
 * @param value Percentage value (e.g., 0.75 for 75%)
 * @returns Formatted percentage string (e.g., "75%")
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(value);
}

/**
 * Format a number with thousand separators
 * @param value Number to format
 * @returns Formatted number string with thousand separators
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Utility functions for formatting data in Kenyan format
 */

// Format currency in Kenyan Shillings
export function formatKESCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return 'KES 0.00';
  
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2
  }).format(numAmount);
}

// Format numbers with Kenyan formatting
export function formatKENumber(num: number | string): string {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  
  if (isNaN(numValue)) return '0';
  
  return new Intl.NumberFormat('en-KE').format(numValue);
}

// Format percentages with Kenyan formatting
export function formatKEPercent(num: number | string, decimals: number = 2): string {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  
  if (isNaN(numValue)) return '0%';
  
  return new Intl.NumberFormat('en-KE', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numValue / 100);
}

// Format dates in Kenyan format (dd/mm/yyyy)
export function formatKEDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-KE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(dateObj);
  } catch (e) {
    console.error('Error formatting date:', e);
    return '';
  }
}

// Format date and time in Kenyan format
export function formatKEDateTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-KE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  } catch (e) {
    console.error('Error formatting datetime:', e);
    return '';
  }
}

// Format relative time (e.g., "2 days ago")
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    
    const rtf = new Intl.RelativeTimeFormat('en-KE', { numeric: 'auto' });
    
    if (diffInSeconds < 60) {
      return rtf.format(-Math.floor(diffInSeconds), 'second');
    } else if (diffInSeconds < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    } else if (diffInSeconds < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    } else if (diffInSeconds < 2592000) {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    } else if (diffInSeconds < 31536000) {
      return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
    } else {
      return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
    }
  } catch (e) {
    console.error('Error formatting relative time:', e);
    return '';
  }
}

// Format phone numbers in Kenyan format
export function formatKEPhoneNumber(phoneNumber: string): string {
  // Clean the phone number first (remove non-numeric characters)
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format for Kenya phone numbers
  if (cleaned.length === 9) {
    // Add the country code if it's missing
    return `+254 ${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  } else if (cleaned.length === 10 && cleaned.startsWith('0')) {
    // Convert 0XXX format to international format
    return `+254 ${cleaned.substring(1, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('254')) {
    // Already in international format, just add spacing
    return `+${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9)}`;
  }
  
  // Return original if it doesn't match expected formats
  return phoneNumber;
}
