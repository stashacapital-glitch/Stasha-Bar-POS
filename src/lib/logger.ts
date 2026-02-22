 // src/lib/logger.ts

export interface LogEntry {
  id: string;
  timestamp: string;
  category: 'SALE' | 'INVENTORY' | 'ROOM' | 'SHIFT' | 'SECURITY' | 'SYSTEM';
  action: string;
  details: string;
  user: string;
  metadata?: any;
}

export const logActivity = (category: LogEntry['category'], action: string, details: string, metadata?: any) => {
  if (typeof window === 'undefined') return; 

  const user = localStorage.getItem('current_staff') || 'System';
  
  const newLog: LogEntry = {
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    category,
    action,
    details,
    user,
    metadata
  };

  const existingLogs: LogEntry[] = JSON.parse(localStorage.getItem('system_logs') || '[]');
  
  // Keep only the last 500 logs
  const updatedLogs = [newLog, ...existingLogs].slice(0, 500);
  
  localStorage.setItem('system_logs', JSON.stringify(updatedLogs));
};