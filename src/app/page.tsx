 "use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// --- TYPES ---
type MenuItem = {
  id: number;
  name: string;
  price: number;
  emoji: string;
  color: string;
};

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  table_number: number;
  total_price: number;
  status: string;
  items: OrderItem[];
};

// --- MENU DATA ---
const menuItems: MenuItem[] = [
  { id: 1, name: 'Draft Beer', price: 300.00, emoji: '🍺', color: 'bg-blue-500 hover:bg-blue-600' },
  { id: 2, name: 'Whiskey', price: 600.00, emoji: '🥃', color: 'bg-amber-500 hover:bg-amber-600' },
  { id: 3, name: 'Cocktail', price: 850.00, emoji: '🍹', color: 'bg-pink-500 hover:bg-pink-600' },
  { id: 4, name: 'Wine', price: 750.00, emoji: '🍷', color: 'bg-green-500 hover:bg-green-600' },
];

export default function Home() {
  // --- AUTH CHECK ---
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // --- STATE ---
  const [tables, setTables] = useState<Order[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // --- FETCH DATA ---
  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('status', 'active');

    if (error) {
      console.log("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
      setTables([]);
    } else {
      setTables(data || []);
    }
    setLoading(false);
  };

  // --- LOGIC ---
  const currentTable = tables.find(t => t.id === selectedTableId);

  const addToOrder = async (itemId: number) => {
    if (!selectedTableId) return;
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;

    const existingItem = currentTable?.items.find(i => i.name === item.name);
    
    try {
      if (existingItem) {
        await supabase
          .from('order_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);
      } else {
        await supabase
          .from('order_items')
          .insert({
            order_id: selectedTableId,
            name: item.name,
            price: item.price,
            quantity: 1
          });
      }
      toast.success(`${item.name} added`);
      fetchOrders();
    } catch (error) {
      toast.error("Error adding item");
    }
  };

  const removeFromOrder = async (itemId: string) => {
    if (!selectedTableId) return;
    const item = currentTable?.items.find(i => i.id === itemId);
    
    try {
      if (item && item.quantity > 1) {
        await supabase
          .from('order_items')
          .update({ quantity: item.quantity - 1 })
          .eq('id', itemId);
      } else {
        await supabase
          .from('order_items')
          .delete()
          .eq('id', itemId);
      }
      toast.success("Item updated");
      fetchOrders();
    } catch (error) {
      toast.error("Error removing item");
    }
  };

  const handlePayment = async () => {
    if (!selectedTableId) return;
    
    try {
      window.print(); // Print receipt
      await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', selectedTableId);
      
      toast.success("Payment Successful!");
      setSelectedTableId(null);
      fetchOrders();
    } catch (error) {
      toast.error("Payment failed");
    }
  };

  const createNewOrder = async (tableNumber: number) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({ table_number: tableNumber, total_price: 0, status: 'active' })
        .select('*, items:order_items(*)')
        .single();
      
      if (data) {
        setTables(prev => [...prev, data]);
        setSelectedTableId(data.id);
        toast.success(`Opened Table ${tableNumber}`);
      }
    } catch (error) {
      toast.error("Could not open table");
    }
  };

  const totalPrice = currentTable?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
  const totalItems = currentTable?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = today.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

  // --- RENDER GUARDS ---
  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-500">Checking Authorization...</div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-500">Loading POS...</div>
      </main>
    );
  }

  // --- VIEW 1: TABLE MAP ---
  if (!selectedTableId) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-800">The Dev Bar</h1>
              <p className="text-gray-500 font-medium">Select a table to start</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="bg-blue-50 px-4 py-2 rounded-xl text-blue-700 text-sm font-medium hidden md:block">
                    👤 {user?.email}
                </div>
                <div className="bg-white px-4 py-2 rounded-xl shadow text-gray-600 font-mono text-sm hidden md:block">
                  {dateStr} | {timeStr}
                </div>
                {/* NEW: Admin Button */}
                <button 
                    onClick={() => router.push('/admin')}
                    className="bg-purple-100 text-purple-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-purple-200 transition-colors"
                >
                    Admin
                </button>
                <button 
                    onClick={signOut}
                    className="bg-red-100 text-red-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-200 transition-colors"
                >
                    Logout
                </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(tableNum => {
              const activeOrder = tables.find(t => t.table_number === tableNum);
              return (
                <button
                  key={tableNum}
                  onClick={() => {
                    if (activeOrder) setSelectedTableId(activeOrder.id);
                    else createNewOrder(tableNum);
                  }}
                  className={`p-8 rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-105 border-2 ${
                    activeOrder
                      ? 'bg-red-500 border-red-700 text-white'
                      : 'bg-white text-gray-500 border-gray-100 hover:border-blue-200'
                  }`}
                >
                  <h2 className="text-2xl font-bold">Table {tableNum}</h2>
                  {activeOrder && (
                    <div className="mt-4 pt-4 border-t border-white/30 text-left">
                      <p className="text-xs uppercase font-bold opacity-80">Current Bill</p>
                      <p className="text-xl font-bold mt-1">KES {activeOrder.total_price.toFixed(2)}</p>
                      <p className="text-xs opacity-80">{activeOrder.items.length} Items</p>
                    </div>
                  )}
                  {!activeOrder && (
                    <div className="mt-4 text-gray-300">
                      <span className="text-4xl">+</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // --- VIEW 2: ORDER SCREEN ---
  return (
    <>
      <div className="flex h-screen bg-gray-100 overflow-hidden print:hidden">
        <div className="flex-1 flex flex-col">
          <header className="bg-white shadow-sm p-4 flex justify-between items-center border-b border-gray-200">
            <button onClick={() => setSelectedTableId(null)} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
              <span className="text-xl">←</span>
              <span className="font-bold">Back</span>
            </button>
            <div className="bg-blue-600 text-white px-4 py-1 rounded-full font-bold text-sm shadow">
              Table {currentTable?.table_number}
            </div>
          </header>

          <div className="flex-1 p-6 overflow-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToOrder(item.id)}
                  className={`${item.color} text-white p-6 rounded-xl shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center aspect-square`}
                >
                  <span className="text-5xl mb-2">{item.emoji}</span>
                  <p className="font-bold text-lg">{item.name}</p>
                  <p className="text-sm opacity-80 font-medium">KES {item.price.toFixed(2)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full md:w-96 bg-white border-l border-gray-200 flex flex-col shadow-xl">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800">Current Order</h2>
            <p className="text-sm text-gray-500">Walk-in Customer</p>
          </div>
          
          <div className="flex-1 p-6 overflow-auto space-y-4">
            {currentTable && currentTable.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <span className="text-6xl mb-4">📝</span>
                <p>No items yet</p>
              </div>
            ) : (
              currentTable?.items.map((item) => (
                <div key={item.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-800">{item.name}</span>
                    <span className="font-bold text-blue-600">KES {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button onClick={() => removeFromOrder(item.id)} className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 font-bold text-sm flex items-center justify-center transition-colors">-</button>
                    <span className="font-bold text-gray-700">{item.quantity}</span>
                    <button onClick={() => addToOrder(menuItems.find(m => m.name === item.name)!.id)} className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-green-500 hover:border-green-200 font-bold text-sm flex items-center justify-center transition-colors">+</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 border-t border-gray-200 bg-white space-y-4">
            <div className="flex justify-between items-end text-gray-600">
              <span className="font-medium">Total ({totalItems} items)</span>
              <span className="text-3xl font-bold text-gray-900">KES {totalPrice.toFixed(2)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => window.print()} className="bg-gray-100 text-gray-600 px-4 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                <span>🖨️</span> Print
              </button>
              <button onClick={handlePayment} className="bg-green-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-600 transition-colors shadow-lg disabled:opacity-50" disabled={totalPrice === 0}>
                Pay Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RECEIPT (Hidden on Screen) */}
      <div className="hidden print:block p-4 font-mono text-sm bg-white text-black w-full">
        <div className="text-center border-b border-dashed border-black pb-2 mb-2">
          <h1 className="text-xl font-bold">THE DEV BAR</h1>
          <p>123 Tech Street, Nairobi</p>
        </div>
        <div className="flex justify-between mb-2 text-xs">
          <span>Date: {dateStr}</span>
          <span>Time: {timeStr}</span>
        </div>
        <table className="w-full text-xs mb-4">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left py-1">Item</th>
              <th className="text-center py-1">Qty</th>
              <th className="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {currentTable?.items.map((item) => (
              <tr key={item.id}>
                <td className="py-1">{item.name}</td>
                <td className="text-center py-1">{item.quantity}</td>
                <td className="text-right py-1">{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-dashed border-black pt-2">
          <div className="flex justify-between text-sm font-bold">
            <span>TOTAL:</span>
            <span>KES {totalPrice.toFixed(2)}</span>
          </div>
        </div>
        <div className="text-center mt-6 text-xs border-t border-dashed border-black pt-2">
          <p className="font-bold">THANK YOU!</p>
        </div>
      </div>
    </>
  );
}