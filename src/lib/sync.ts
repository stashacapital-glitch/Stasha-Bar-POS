// src/lib/sync.ts

// Create a broadcast channel for all POS screens to talk
export const posChannel = new BroadcastChannel('pos_sync_channel');

// Function to broadcast an update
export const broadcastUpdate = (type: string, data: any) => {
  posChannel.postMessage({ type, data });
};