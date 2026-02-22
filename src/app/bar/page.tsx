 "use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Receipt from '@/components/Receipt';

export default function BarPage() {
  const [orders, setOrders] = useState<any[]>([]);

  const refreshOrders = () => {
    const savedTables = localStorage.getItem('posTables');
    if (savedTables) {
      const tables = JSON.parse(savedTables);
      const active = tables.filter((t: any) => 
        (t.status === 'pending' || t.status === 'billed') && t.order?.length > 0
      );
      setOrders(active);
    }
  };

  useEffect(() => {
    refreshOrders();
    const channel = new BroadcastChannel('pos_update_channel');
    channel.onmessage = () => refreshOrders();
    const interval = setInterval(refreshOrders, 2000);
    return () => { clearInterval(interval); channel.close(); };
  }, []);

  const dispenseItem = (tableId: number, itemName: string, type: 'bar' | 'kitchen') => {
    const savedTables = localStorage.getItem('posTables');
    if (!savedTables) return;
    const tables = JSON.parse(savedTables);
    
    const updatedTables = tables.map((t: any) => {
      if (t.id === tableId) {
        const newOrder = t.order.map((item: any) => {
          if (item.name === itemName && item.type === type) {
            return { ...item, doneQty: (item.doneQty || 0) + 1 };
          }
          return item;
        });
        const allDone = newOrder.every((item: any) => (item.doneQty || 0) >= item.qty);
        return { ...t, order: newOrder, status: allDone ? 'ready' : 'pending' };
      }
      return t;
    });

    localStorage.setItem('posTables', JSON.stringify(updatedTables));
    const channel = new BroadcastChannel('pos_update_channel');
    channel.postMessage('update');
    channel.close();
    refreshOrders();
  };

  const printBill = (tableId: number) => {
    const savedTables = localStorage.getItem('posTables');
    if (!savedTables) return;
    const tables = JSON.parse(savedTables);
    const updatedTables = tables.map((t: any) => (t.id === tableId ? { ...t, status: 'billed' } : t));
    localStorage.setItem('posTables', JSON.stringify(updatedTables));
    refreshOrders();
    setTimeout(() => window.print(), 300);
  };

  const clearTable = (tableId: number) => {
    const savedTables = localStorage.getItem('posTables');
    if (!savedTables) return;
    const tables = JSON.parse(savedTables);
    const updatedTables = tables.map((t: any) => (t.id === tableId ? { id: tableId, bill: 0, order: [], status: 'open' } : t));
    localStorage.setItem('posTables', JSON.stringify(updatedTables));
    const channel = new BroadcastChannel('pos_update_channel');
    channel.postMessage('update');
    channel.close();
    refreshOrders();
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-orange-500">Counter Control</h1>
            {/* FIXED LINE BELOW: No arrows used */}
            <p className="text-gray-400 text-sm">Dispense, Bill, Clear</p>
          </div>
          <Link href="/" className="bg-gray-600 px-4 py-2 rounded text-sm">Dashboard</Link>
        </header>

        {orders.length === 0 ? (
          <div className="text-center text-gray-500 py-20 bg-gray-800 rounded-lg border border-dashed border-gray-600">
            <p className="text-xl">No active orders.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((table) => {
              const totalBill = table.order.reduce((sum: number, item: any) => sum + (item.price * item.qty), 0);
              const isBilled = table.status === 'billed';
              const allItemsServed = table.order.every((item: any) => (item.doneQty || 0) >= item.qty);

              return (
                <div key={table.id} className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-xl relative">
                  {isBilled && <div className="absolute top-0 right-0 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">BILLED</div>}

                  <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                    <h2 className="text-2xl font-bold text-yellow-400">Table {table.id}</h2>
                    <span className={`px-2 py-1 text-xs rounded ${allItemsServed ? 'bg-green-600' : 'bg-yellow-600 text-black'}`}>
                      {allItemsServed ? 'READY' : 'PROCESSING'}
                    </span>
                  </div>
                  
                  <div className="grid gap-3 mb-4">
                    {table.order.map((item: any, i: number) => {
                      const doneQty = item.doneQty || 0;
                      const remaining = item.qty - doneQty;
                      const isComplete = remaining <= 0;
                      const isBar = item.type === 'bar';

                      return (
                        <div key={i} className={`p-4 rounded ${isComplete ? 'bg-green-900 border border-green-600' : 'bg-gray-700 border border-gray-600'}`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-lg">{item.name} 
                                <span className={`ml-2 text-xs px-2 py-1 rounded ${isBar ? 'bg-amber-600' : 'bg-blue-600'}`}>
                                  {isBar ? 'DRINK' : 'FOOD'}
                                </span>
                              </p>
                              <p className="text-sm text-gray-400">Done: {doneQty} / {item.qty}</p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {!isComplete && !isBilled && (
                                <>
                                  {isBar ? (
                                    <button onClick={() => dispenseItem(table.id, item.name, 'bar')} className="bg-green-600 hover:bg-green-500 px-4 py-1 rounded font-bold text-sm">DISPENSE</button>
                                  ) : (
                                    <span className="text-xs bg-yellow-700 px-2 py-1 rounded text-black">COOKING...</span>
                                  )}
                                </>
                              )}
                              {isComplete && <span className="text-green-400 font-bold text-sm">SERVED</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-gray-700 pt-4 flex flex-col gap-2">
                    <div className="flex justify-between font-bold text-lg mb-2">
                      <span>TOTAL:</span>
                      <span>KES {totalBill.toFixed(2)}</span>
                    </div>

                    {!isBilled ? (
                      <button onClick={() => printBill(table.id)} disabled={!allItemsServed}
                        className={`w-full py-3 rounded-lg font-bold text-lg transition-colors ${allItemsServed ? 'bg-orange-500 hover:bg-orange-600 text-black' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>
                        {allItemsServed ? 'PRINT BILL' : 'Dispense all items first...'}
                      </button>
                    ) : (
                      <button onClick={() => clearTable(table.id)} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-lg font-bold text-lg text-white">
                        PAYMENT RECEIVED (Clear Table)
                      </button>
                    )}
                  </div>

                  <div className="hidden print:block">
                     <Receipt items={table.order} tableId={table.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-area, #receipt-area * { visibility: visible; }
          #receipt-area { position: absolute; left: 0; top: 0; width: 100%; background: white; }
          header, button, .no-print { display: none !important; }
        }
      `}</style>
    </main>
  );
}