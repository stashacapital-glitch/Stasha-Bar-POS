"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

type OrderItem = { id: string; name: string; quantity: number; status: string; category: string };
type Order = { id: string; created_at: string; table_number: number; waiter_name: string; items: OrderItem[] };

export default function KitchenPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) router.push('/login');
    if (user) { fetchOrders(); const interval = setInterval(fetchOrders, 5000); return () => clearInterval(interval); }
  }, [user]);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, created_at, table_number, waiter_name, items:order_items(id, name, quantity, status, category)')
      .eq('status', 'active')
      .in('order_status', ['requested', 'processing'])
      .order('created_at', { ascending: true });
    
    if (data) {
        // STRICT FIX: Only category 'Food' goes to Kitchen
        const foodOrders = data.filter(o => 
            o.items.some(i => i.category === 'Food')
        ).map(o => ({
            ...o,
            items: o.items.filter(i => i.category === 'Food')
        }));
        
        setOrders(foodOrders);
    }
    setLoading(false);
  };

  const markItemReady = async (orderId: string, itemId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) return { ...o, items: o.items.map(i => i.id === itemId ? { ...i, status: 'ready' } : i) };
      return o;
    }));

    const { error } = await supabase.from('order_items').update({ status: 'ready' }).eq('id', itemId);
    if (error) { toast.error("Error"); fetchOrders(); } 
    else toast.success("Ready!");
  };

  const countPendingItems = (items: OrderItem[]) => items.filter(i => i.status !== 'ready').length;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-orange-500">🍳 Kitchen</h1>
        <div className="flex gap-2">
            <button onClick={() => router.push('/bar')} className="bg-blue-700 px-4 py-2 rounded font-bold text-sm">Bar/Cashier</button>
            <button onClick={signOut} className="bg-red-800 px-4 py-2 rounded font-bold text-sm">Logout</button>
        </div>
      </div>

      {loading ? <p className="text-center text-gray-400 text-2xl mt-20">...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.length === 0 && <div className="col-span-full text-center text-gray-500 text-3xl mt-20 font-bold">No Food Orders</div>}
          
          {orders.map((order) => {
             const pendingCount = countPendingItems(order.items);
             const isOrderComplete = pendingCount === 0;

             return (
              <div key={order.id} className={`rounded-xl shadow-lg border ${isOrderComplete ? 'bg-green-900 border-green-700' : 'bg-gray-800 border-gray-700'}`}>
                <div className="bg-gray-700 p-3 rounded-t-xl flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold">{order.table_number === 0 ? '🚶 Walk-in' : `🍽️ T${order.table_number}`}</h2>
                    <p className="text-sm text-yellow-400 font-bold">Waiter: {order.waiter_name}</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleTimeString()}</span>
                </div>
                
                <div className="p-4 space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className={`flex justify-between items-center p-4 rounded-lg ${item.status === 'ready' ? 'bg-green-800 opacity-50' : 'bg-gray-700'}`}>
                      <div className="flex items-center gap-3">
                         <span className="text-3xl font-bold text-orange-400">{item.quantity}x</span>
                         <span className="text-xl font-bold">{item.name}</span>
                      </div>
                      
                      {item.status !== 'ready' ? (
                        <button onClick={() => markItemReady(order.id, item.id)} className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded font-bold text-lg">DONE</button>
                      ) : (
                        <span className="text-green-300 font-bold text-lg">✓ READY</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 