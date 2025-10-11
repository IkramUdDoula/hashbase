/**
 * Format a date string to show relative time for recent dates (< 24 hours)
 * or full date with time for older dates
 * 
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 * 
 * Examples:
 * - "Just now" (< 1 minute)
 * - "5m ago" (< 1 hour)
 * - "3h ago" (< 24 hours)
 * - "Jan 15, 2025 3:45 PM" (>= 24 hours)
 */
export function formatRelativeDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  // Show relative time for less than 24 hours
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  
  // Show full date with time for older dates
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  
  return `${month} ${day}, ${year} ${hours}:${minutesStr} ${ampm}`;
}
