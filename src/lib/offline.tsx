 // src/lib/offline.ts
import { createClient } from '@/utils/supabase';

// Initialize the client
const supabase = createClient();

export const saveRecord = async (table: string, data: any) => {
  // 1. Save to LocalStorage (Immediate)
  const offlineData = JSON.parse(localStorage.getItem('offline_data') || '[]');
  offlineData.push({ table, data, timestamp: Date.now() });
  localStorage.setItem('offline_data', JSON.stringify(offlineData));

  // 2. Try to sync if online
  if (navigator.onLine) {
    return processQueue();
  }
};

export const processQueue = async () => {
  const offlineData = JSON.parse(localStorage.getItem('offline_data') || '[]');
  
  if (offlineData.length === 0) return;

  const successfulSyncs: number[] = [];

  for (let i = 0; i < offlineData.length; i++) {
    const { table, data } = offlineData[i];
    
    try {
      const { error } = await supabase.from(table).insert(data);
      
      if (!error) {
        successfulSyncs.push(i);
      }
    } catch (err) {
      console.error(`Failed to sync record ${i}:`, err);
    }
  }

  // Remove successfully synced items
  if (successfulSyncs.length > 0) {
    const remainingData = offlineData.filter((_: any, index: number) => !successfulSyncs.includes(index));
    localStorage.setItem('offline_data', JSON.stringify(remainingData));
  }
};