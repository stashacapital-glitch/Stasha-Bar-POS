 // src/lib/offline.ts
import { supabase } from '@/utils/supabase';

export const saveRecord = async (table: string, data: any) => {
  // 1. Save to LocalStorage (Immediate)
  const localData = JSON.parse(localStorage.getItem(`local_${table}`) || '[]');
  const newRecord = { ...data, id: Date.now(), synced: false };
  localData.push(newRecord);
  localStorage.setItem(`local_${table}`, JSON.stringify(localData));

  // 2. Try Sync (Background)
  if (navigator.onLine) {
    try {
      const { error } = await supabase.from(table).insert([data]);
      
      if (!error) {
        // Mark as synced
        const updatedData = localData.map((d: any) => 
          d.id === newRecord.id ? { ...d, synced: true } : d
        );
        localStorage.setItem(`local_${table}`, JSON.stringify(updatedData));
        console.log(`☁️ Synced to cloud: ${table}`);
      } else {
        // If table doesn't exist or other error, queue it silently
        console.warn("Cloud sync pending: Table not found or connection issue.");
        queueForSync(table, data);
      }
    } catch (err) {
      console.warn("Offline mode active: Data saved locally.");
      queueForSync(table, data);
    }
  } else {
    queueForSync(table, data);
  }
  
  return newRecord;
};

const queueForSync = (table: string, data: any) => {
  const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
  queue.push({ table, data, timestamp: Date.now() });
  localStorage.setItem('sync_queue', JSON.stringify(queue));
};

export const processQueue = async () => {
  if (!navigator.onLine) return;
  
  const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
  if (queue.length === 0) return;

  console.log(`Found ${queue.length} pending items...`);
  
  const failedItems: any[] = [];

  for (const item of queue) {
    try {
      const { error } = await supabase.from(item.table).insert([item.data]);
      if (error) throw error;
      console.log(`Synced queued item`);
    } catch (err) {
      failedItems.push(item);
    }
  }

  localStorage.setItem('sync_queue', JSON.stringify(failedItems));
  
  return {
    total: queue.length,
    success: queue.length - failedItems.length,
    failed: failedItems.length
  };
};