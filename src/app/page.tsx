 "use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

type MenuItem = { id: string; name: string; price: number; emoji: string; color: string; stock_quantity: number; category: string };
type OrderItem = { id: string; name: string; price: number; quantity: number };
type Order = { id: string; table_number: number; total_price: number; status: string; items: OrderItem[]; order_status: string };

const CATEGORY_COLORS: Record<string, string> = {
    'Beer': 'bg-blue-500 hover:bg-blue-600', 'Whisky': 'bg-amber-500 hover:bg-amber-600',
    'Spirits': 'bg-indigo-500 hover:bg-indigo-600', 'Wines': 'bg-red-500 hover:bg-red-600',
    'Soft Drink': 'bg-gray-500 hover:bg-gray-600', 'Food': 'bg-orange-500 hover:bg-orange-600',
    'Tots': 'bg-purple-500 hover:bg-purple-600', 'Cigar': 'bg-yellow-600 hover:bg-yellow-700',
    'General': 'bg-teal-500 hover:bg-teal-600'
};

const formatMoney = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2 });

export default function Home() {
  const { user, role, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [waiterName, setWaiterName] = useState('');
  const [nameSet, setNameSet] = useState(false);

  const [tables, setTables] = useState<Order[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [tableCount, setTableCount] = useState(6);

  // --- INIT ---
  useEffect(() => {
    const storedName = localStorage.getItem('waiter_name');
    if (storedName) { setWaiterName(storedName); setNameSet(true); }
  }, []);

  useEffect(() => { if (nameSet) fetchData(); }, [nameSet]);

  const handleSetName = () => {
    if(!waiterName) return toast.error("Enter your name");
    localStorage.setItem('waiter_name', waiterName);
    setNameSet(true);
  };

  // --- DATA FETCHING ---
  const fetchData = async () => { setLoading(true); await fetchSettings(); await fetchOrders(); setLoading(false); };

  const fetchSettings = async () => {
    try {
        if (navigator.onLine) {
            const { data: menuData } = await supabase.from('menu_items').select('*').eq('active', true);
            if (menuData) { setMenuItems(menuData); localStorage.setItem('pos_menu', JSON.stringify(menuData)); }
            const { data: settingsData } = await supabase.from('settings').select('table_count').eq('id', 1).single();
            if (settingsData) setTableCount(settingsData.table_count);
        } else {
            const cachedMenu = localStorage.getItem('pos_menu');
            if (cachedMenu) setMenuItems(JSON.parse(cachedMenu));
        }
    } catch (e) { console.error(e); }
  };

  const fetchOrders = async () => {
    try {
        if (!navigator.onLine) return;
        const { data } = await supabase.from('orders').select('*, items:order_items(*)')
            .eq('status', 'active')
            .eq('waiter_name', waiterName)
            .order('created_at', { ascending: false });
        
        if (data) {
            const ordersWithTotals = data.map(order => ({ ...order, total_price: order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) }));
            setTables(ordersWithTotals);
        }
    } catch (e) { console.error(e); }
  };

  // --- NAME ENTRY SCREEN ---
  if (authLoading) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;

  if (!nameSet) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-sm w-full">
          <h1 className="text-2xl font-bold mb-4">Start Shift</h1>
          <p className="text-gray-500 text-sm mb-4">Role: <span className="font-bold capitalize">{role || 'Staff'}</span></p>
          <input type="text" placeholder="Your Name" className="w-full border p-3 rounded-lg text-center text-xl mb-4" value={waiterName} onChange={(e) => setWaiterName(e.target.value)} />
          <button onClick={handleSetName} className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold text-lg">Start</button>
        </div>
      </div>
    );
  }

  // --- ACTIONS ---
  const addToOrder = async (unknownId: string) => {
    if (!selectedTableId) return;
    let menuItem = menuItems.find(i => i.id === unknownId);
    if (!menuItem) {
        const tablesSnapshot = tables.find(t => t.id === selectedTableId);
        const orderItem = tablesSnapshot?.items.find(i => i.id === unknownId);
        if (orderItem) menuItem = menuItems.find(m => m.name === orderItem.name);
    }
    if (!menuItem) return;

    // UI Update
    setMenuItems(prev => prev.map(m => m.id === menuItem?.id ? { ...m, stock_quantity: Math.max(0, m.stock_quantity - 1) } : m ));
    setTables(prevTables => {
      return prevTables.map(table => {
        if (table.id !== selectedTableId) return table;
        const existingItem = table.items.find(i => i.name === menuItem?.name);
        let newItems;
        if (existingItem) {
          newItems = table.items.map(i => i.id === existingItem.id ? { ...i, quantity: i.quantity + 1 } : i);
        } else {
          const tempId = `temp-${Date.now()}`;
          newItems = [...table.items, { ...menuItem, id: tempId, quantity: 1 }];
        }
        return { ...table, items: newItems, total_price: newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0) };
      });
    });

    // DB Save
    if (navigator.onLine) {
        try {
            const { data: dbItem } = await supabase.from('order_items').select('id, quantity').eq('order_id', selectedTableId).eq('name', menuItem.name).maybeSingle();
            if (dbItem) {
                await supabase.from('order_items').update({ quantity: dbItem.quantity + 1 }).eq('id', dbItem.id);
            } else {
                await supabase.from('order_items').insert({ order_id: selectedTableId, name: menuItem.name, price: menuItem.price, quantity: 1, status: 'requested', category: menuItem.category });
            }
        } catch (e) { console.error(e); }
    }
    toast.success(`${menuItem.name} added`);
  };

  const removeFromOrder = async (itemId: string) => {
    if (!selectedTableId) return;
    const table = tables.find(t => t.id === selectedTableId);
    const orderItem = table?.items.find(i => i.id === itemId);
    if (!orderItem) return;
    const menuItem = menuItems.find(m => m.name === orderItem.name);
    if (menuItem) setMenuItems(prev => prev.map(m => m.id === menuItem.id ? { ...m, stock_quantity: m.stock_quantity + 1 } : m ));

    setTables(prevTables => {
        return prevTables.map(table => {
            if (table.id !== selectedTableId) return table;
            const itemInPrev = table.items.find(i => i.id === itemId);
            if (!itemInPrev) return table;
            let newItems;
            if (itemInPrev.quantity > 1) { newItems = table.items.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i); } 
            else { newItems = table.items.filter(i => i.id !== itemId); }
            return { ...table, items: newItems, total_price: newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0) };
        });
    });
    
    if (navigator.onLine) {
        const tableNow = tables.find(t => t.id === selectedTableId);
        const itemNow = tableNow?.items.find(i => i.id === itemId);
        if (itemNow) {
            if (itemNow.quantity > 1) await supabase.from('order_items').update({ quantity: itemNow.quantity - 1 }).eq('id', itemId);
            else await supabase.from('order_items').delete().eq('id', itemId);
        }
    }
  };

  const handleSendToBar = async () => {
    if (!selectedTableId) return;
    await supabase.from('orders').update({ order_status: 'requested' }).eq('id', selectedTableId);
    toast.success("Order Sent!");
    setSelectedTableId(null);
    fetchOrders();
  };

  const createNewOrder = async (tableNumber: number) => {
    if (navigator.onLine) {
        try {
            const { data } = await supabase.from('orders').insert({ table_number: tableNumber, total_price: 0, status: 'active', waiter_name: waiterName, order_status: 'draft' }).select('*, items:order_items(*)').single();
            if (data) { setTables(prev => [...prev, data]); setSelectedTableId(data.id); }
        } catch (e) { toast.error("Cannot open table."); }
    }
  };

  // --- RENDER ---
  const currentTable = tables.find(t => t.id === selectedTableId);
  const currentItems = currentTable?.items || [];
  const totalPrice = currentItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = currentItems.reduce((sum, item) => sum + item.quantity, 0);
  const categories = ['All', ...new Set(menuItems.map(item => item.category))];
  const filteredMenu = activeCategory === 'All' ? menuItems : menuItems.filter(item => item.category === activeCategory);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  // --- TABLE VIEW ---
  if (!selectedTableId) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div><h1 className="text-2xl font-bold">Staff: {waiterName}</h1><p className="text-gray-500 text-sm">Role: {role}</p></div>
            <div className="flex gap-2">
                {(role === 'owner' || role === 'admin') && (<button onClick={() => router.push('/admin')} className="bg-purple-600 text-white px-4 py-2 rounded font-bold text-sm">Admin</button>)}
                {(role === 'owner' || role === 'admin' || role === 'barman') && (<button onClick={() => router.push('/bar')} className="bg-orange-500 text-white px-4 py-2 rounded font-bold text-sm">Bar</button>)}
                <button onClick={() => { localStorage.removeItem('waiter_name'); setNameSet(false); }} className="bg-red-100 text-red-600 px-4 py-2 rounded font-bold text-sm">End Shift</button>
            </div>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-8">
            <button onClick={() => createNewOrder(0)} className="p-6 bg-blue-600 text-white rounded-xl font-bold text-center shadow-lg border-2 border-blue-700">🚶 Walk-in</button>
            
            {Array.from({ length: tableCount }, (_, i) => i + 1).map(tableNum => {
              const activeOrder = tables.find(t => t.table_number === tableNum);
              return (
                <button key={tableNum} onClick={() => activeOrder ? setSelectedTableId(activeOrder.id) : createNewOrder(tableNum)}
                  className={`p-6 rounded-xl shadow font-bold text-center transition-transform hover:scale-105 ${activeOrder ? 'bg-red-500 text-white' : 'bg-white text-gray-600'}`}>
                  <p className="text-xl">{activeOrder ? '📝' : '🍽️'}</p><p className="mt-1">T{tableNum}</p>
                </button>
              );
            })}
          </div>

          <h3 className="font-bold text-gray-600 mb-2">Your Active Orders</h3>
          <div className="bg-white rounded-xl p-4 shadow">
            {tables.length === 0 ? <p className="text-gray-400 text-center py-4">No active orders</p> : 
              <div className="space-y-2">
                {tables.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-2 border rounded">
                        <div>
                            <span className="font-bold">{t.table_number === 0 ? 'Walk-in' : `Table ${t.table_number}`}</span>
                            <span className={`ml-2 text-xs px-2 py-1 rounded ${t.order_status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.order_status || 'pending'}</span>
                        </div>
                        <div className="flex gap-2"><span>KES {formatMoney(t.total_price)}</span><button onClick={() => setSelectedTableId(t.id)} className="text-blue-600 font-bold">Edit</button></div>
                    </div>
                ))}
              </div>
            }
          </div>
        </div>
      </main>
    );
  }

  // --- ORDER VIEW ---
  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white p-3 flex justify-between items-center border-b shadow-sm">
          <button onClick={() => setSelectedTableId(null)} className="text-blue-600 font-bold">← Back</button>
          <div className="font-bold">{currentTable?.table_number === 0 ? 'Walk-in' : `Table ${currentTable?.table_number}`}</div>
          <div className="text-xs text-gray-500">Staff: {waiterName}</div>
        </header>
        <div className="bg-gray-50 p-2 flex gap-1 overflow-x-auto">
            {categories.map(cat => (<button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>{cat}</button>))}
        </div>
        <div className="flex-1 p-2 overflow-auto">
            <div className="grid grid-cols-3 gap-2">
                {filteredMenu.map(item => {
                    const stock = Math.max(0, item.stock_quantity);
                    return (
                        <button 
                            key={item.id} 
                            onClick={() => addToOrder(item.id)} 
                            disabled={stock <= 0} 
                            className={`${CATEGORY_COLORS[item.category] || 'bg-gray-500'} text-white p-3 rounded-lg flex flex-col items-center justify-center aspect-square relative ${stock <= 0 ? 'opacity-40' : ''}`}
                        >
                            {/* --- FIXED STOCK DISPLAY --- */}
                            <div className="absolute top-1 right-1 bg-black/30 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                                {stock}
                            </div>
                            
                            <span className="text-2xl mb-1">{item.emoji}</span>
                            <p className="font-bold text-sm text-center leading-tight">{item.name}</p>
                            <p className="text-[11px] opacity-90 mt-1 font-bold">{formatMoney(item.price)}</p>
                        </button>
                    );
                })}
            </div>
        </div>
      </div>

      <div className="w-80 bg-white border-l flex flex-col">
        <div className="p-4 bg-gray-50 border-b font-bold">Order Items</div>
        <div className="flex-1 p-2 overflow-auto space-y-2">
            {currentItems.map(item => (
                <div key={item.id} className="bg-gray-50 p-2 rounded border flex justify-between items-center">
                    <div><p className="font-bold text-sm">{item.name}</p><p className="text-xs text-gray-500">KES {formatMoney(item.price)}</p></div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => removeFromOrder(item.id)} className="w-6 h-6 rounded bg-gray-200 text-xs font-bold">-</button>
                        <span className="font-bold">{item.quantity}</span>
                        <button onClick={() => addToOrder(item.id)} className="w-6 h-6 rounded bg-blue-500 text-white text-xs font-bold">+</button>
                    </div>
                </div>
            ))}
        </div>
        <div className="p-4 border-t bg-gray-50">
            <div className="flex justify-between font-bold text-lg mb-4"><span>Total</span><span>KES {formatMoney(totalPrice)}</span></div>
            <button onClick={handleSendToBar} disabled={currentItems.length === 0} className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold disabled:opacity-50">SEND TO BAR</button>
        </div>
      </div>
    </div>
  );
}