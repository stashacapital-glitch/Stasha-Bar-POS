 "use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function KitchenPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [plan, setPlan] = useState('Basic');

  // 1. Load Plan and Orders
  const refreshData = () => {
    const activePlan = localStorage.getItem('activePlan') || 'Basic';
    setPlan(activePlan);

    if (activePlan !== 'Regular' && activePlan !== 'Pro') {
      return;
    }

    const savedTables = localStorage.getItem('pos_tables_data');
    if (savedTables) {
      const tables = JSON.parse(savedTables);
      
      // Filter tables that are pending
      const pending = tables.filter((t: any) => t.status === 'pending' && t.order && t.order.length > 0);
      
      // Filter items inside the order to ONLY show Kitchen items
      const kitchenOrders = pending.map((t: any) => {
        return {
          ...t,
          kitchenItems: t.order.filter((item: any) => item.type === 'kitchen')
        };
      }).filter((t: any) => t.kitchenItems.length > 0);

      setOrders(kitchenOrders);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, []);

  // 2. Mark Order as Ready (Notifies Waiter)
  const markReady = (tableId: number) => {
    const savedTables = localStorage.getItem('pos_tables_data');
    if (!savedTables) return;

    const tables = JSON.parse(savedTables);
    const updatedTables = tables.map((t: any) => {
      if (t.id === tableId) {
        return { ...t, status: 'ready' }; // Status 'ready' triggers notification
      }
      return t;
    });

    localStorage.setItem('pos_tables_data', JSON.stringify(updatedTables));
    refreshData();
  };

  // Guard Clause
  if (plan !== 'Regular' && plan !== 'Pro') {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Access Denied</h1>
        <p className="text-gray-400 mb-8">Kitchen Module requires Regular or Pro plan.</p>
        <Link href="/pos" className="bg-blue-600 px-6 py-2 rounded-lg">Back to Tables</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        
        <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Kitchen Display</h1>
            <p className="text-gray-400 text-sm">Showing Food Orders Only</p>
          </div>
          <Link href="/pos" className="bg-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-600">
            Back to Tables
          </Link>
        </header>

        {orders.length === 0 ? (
          <div className="text-center text-gray-500 py-20 bg-gray-800 rounded-lg border border-dashed border-gray-600">
            <p className="text-xl">No food orders.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {orders.map((table) => (
              <div key={table.id} className="bg-gray-800 p-6 rounded-xl border border-blue-500 shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
                  <div>
                    <h2 className="text-2xl font-bold text-yellow-400">Table {table.id}</h2>
                    {/* NEW: Display Waiter Name */}
                    <p className="text-sm text-gray-400">
                      Called by: <span className="text-white font-bold text-base">{table.waiter || 'Unknown'}</span>
                    </p>
                  </div>
                  <span className="bg-yellow-600 text-black px-3 py-1 rounded text-sm font-bold animate-pulse">
                    PENDING
                  </span>
                </div>

                {/* Render ONLY Kitchen Items */}
                <div className="space-y-2 mb-4">
                  {table.kitchenItems.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between p-3 bg-gray-700 rounded text-lg border-l-4 border-orange-500">
                      <span className="font-bold">{item.name}</span>
                      <span className="text-orange-400 font-bold">x{item.qty}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => markReady(table.id)}
                  className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-lg font-bold text-lg transition-colors"
                >
                  MARK AS READY (Notify {table.waiter || 'Waiter'})
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}