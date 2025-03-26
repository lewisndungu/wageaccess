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