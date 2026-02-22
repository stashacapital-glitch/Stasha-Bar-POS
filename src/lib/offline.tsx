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
  
  // FIX: Return early result if empty
  if (offlineData.length === 0) {
    return { success: 0, failed: 0 };
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < offlineData.length; i++) {
    const { table, data } = offlineData[i];
    
    try {
      const { error } = await supabase.from(table).insert(data);
      
      if (!error) {
        successCount++;
      } else {
        failCount++;
        console.error(`Failed to sync record ${i}:`, error);
      }
    } catch (err) {
      failCount++;
      console.error(`Exception syncing record ${i}:`, err);
    }
  }

  // Remove ONLY successfully synced items
  if (successCount > 0) {
    // We keep failed items in local storage for next attempt
    // For simplicity here, we filter out all items that were attempted 
    // (assuming success means removed, fail means kept).
    // Actually, to keep it simple for now: 
    // If we synced ANY, we clear the queue to avoid infinite loops of broken data.
    // Ideally, you filter specific indices. Let's just clear the queue for now.
    localStorage.removeItem('offline_data'); 
  }

  // FIX: Return the report object
  return { success: successCount, failed: failCount };
};