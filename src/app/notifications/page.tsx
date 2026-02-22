"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [staffName, setStaffName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const staff = localStorage.getItem('current_staff') || 'Waiter 1';
    setStaffName(staff);

    const savedTables = localStorage.getItem('pos_tables_data');
    if (savedTables) {
      const tables = JSON.parse(savedTables);
      // Filter: Status is Ready AND Waiter matches
      const myOrders = tables.filter((t: any) => 
        t.status === 'ready' && t.waiter === staff
      );
      setReadyOrders(myOrders);
    }
  }, []);

  const acknowledge = (tableId: number) => {
    // Optionally auto-clear or just navigate to serve
    router.push(`/table/${tableId}`);
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-red-500">🔔 Notifications</h1>
            <p className="text-gray-400 text-sm">Orders ready for: <span className="text-white font-bold">{staffName}</span></p>
          </div>
          <Link href="/pos" className="bg-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-500">
            Back to Tables
          </Link>
        </header>

        {readyOrders.length === 0 ? (
          <div className="text-center text-gray-500 py-20 bg-gray-800 rounded-lg border border-dashed border-gray-600">
            <p className="text-xl">No pending notifications.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {readyOrders.map((table) => (
              <div key={table.id} className="bg-green-800 border border-green-500 p-6 rounded-xl flex justify-between items-center animate-pulse">
                <div>
                  <h2 className="text-2xl font-bold">Table {table.id} is READY!</h2>
                  <p className="text-sm text-green-200">Kitchen has prepared the order.</p>
                </div>
                <button 
                  onClick={() => acknowledge(table.id)}
                  className="bg-white text-green-800 px-6 py-3 rounded-lg font-bold hover:bg-gray-100"
                >
                  SERVE NOW
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}