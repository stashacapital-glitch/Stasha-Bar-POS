 "use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

// --- TYPES ---
type Order = { id: string; created_at: string; table_number: number; total_price: number; status: string; payment_method: string; waiter_name: string };
type MenuItem = { id: string; name: string; price: number; emoji: string; color: string; stock_quantity: number; opening_stock: number; purchases: number; low_stock_level: number; category: string; active: boolean; actual_stock: number };
type Expense = { id: string; name: string; amount: number; category: string; created_at: string };
type DailySale = { name: string; quantity: number };
type Profile = { id: string; email: string; role: string; full_name: string; approved: boolean };
type WaiterStat = { name: string; total: number };

const CATEGORIES = ['Beer', 'Whisky', 'Spirits', 'Wines', 'Soft Drink', 'Food', 'Tots', 'Cigar', 'General'];
const EXPENSE_TYPES = ['Fixed', 'Variable'];

const formatMoney = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminDashboard() {
  const { user, role, signOut } = useAuth();
  const router = useRouter();
  
  // --- STATE ---
  const [totalSales, setTotalSales] = useState(0);
  const [todaysSales, setTodaysSales] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [tableCount, setTableCount] = useState(6);
  const [ownerPhone, setOwnerPhone] = useState('');
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalFixedCosts, setTotalFixedCosts] = useState(0);
  const [totalVariableCosts, setTotalVariableCosts] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  
  // REPORT STATE
  const [cashSales, setCashSales] = useState(0);
  const [mpesaSales, setMpesaSales] = useState(0);
  const [printMode, setPrintMode] = useState<'sales' | 'stock'>('sales');

  // STAFF & TRACKING STATE
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [waiterStats, setWaiterStats] = useState<WaiterStat[]>([]);
  const [lowStockItems, setLowStockItems] = useState<MenuItem[]>([]); // NEW

  const [loading, setLoading] = useState(true);
  
  // Forms
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('General');
  const [newItemLowLevel, setNewItemLowLevel] = useState('5');
  const [newItemOpening, setNewItemOpening] = useState('0');
  
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseType, setNewExpenseType] = useState('Variable');

  // Staff Form
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('waiter');

  useEffect(() => { if (!user) router.push('/login'); if (user) fetchData(); }, [user]);
  useEffect(() => { setNetProfit(totalSales - (totalFixedCosts + totalVariableCosts)); }, [totalSales, totalFixedCosts, totalVariableCosts]);

  // --- DATA FETCHING ---
  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
        fetchDashboardData(), 
        fetchMenuAndSales(), 
        fetchSettings(), 
        fetchExpenses(), 
        fetchStaff(),
        fetchStaffPerformance()
    ]);
    setLoading(false);
  };

  const fetchDashboardData = async () => {
    const { data: orders } = await supabase.from('orders').select('*').eq('status', 'paid').order('created_at', { ascending: false });
    if (orders) {
      setTotalSales(orders.reduce((sum, o) => sum + o.total_price, 0));
      const today = new Date().toDateString();
      const todaysOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
      setTodaysSales(todaysOrders.reduce((sum, o) => sum + o.total_price, 0));
      
      const cash = todaysOrders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + o.total_price, 0);
      const mpesa = todaysOrders.filter(o => o.payment_method === 'mpesa').reduce((sum, o) => sum + o.total_price, 0);
      setCashSales(cash);
      setMpesaSales(mpesa);

      setRecentOrders(orders.slice(0, 10));
    }
  };

  const fetchMenuAndSales = async () => {
    const { data: menuData } = await supabase.from('menu_items').select('*').order('category').order('name');
    if (menuData) {
        setMenuItems(menuData);
        // NEW: Check Low Stock
        const lowItems = menuData.filter(item => item.stock_quantity <= item.low_stock_level);
        setLowStockItems(lowItems);
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: paidItems } = await supabase.from('order_items').select('name, quantity, orders!inner(created_at, status)').eq('orders.status', 'paid').gte('orders.created_at', today);
    const { data: activeItems } = await supabase.from('order_items').select('name, quantity, orders!inner(status)').eq('orders.status', 'active');

    const salesMap: Record<string, number> = {};
    paidItems?.forEach((item: any) => salesMap[item.name] = (salesMap[item.name] || 0) + item.quantity);
    activeItems?.forEach((item: any) => salesMap[item.name] = (salesMap[item.name] || 0) + item.quantity);
    setDailySales(Object.entries(salesMap).map(([name, quantity]) => ({ name, quantity })));
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('table_count, owner_phone').eq('id', 1).single();
    if (data) { setTableCount(data.table_count); setOwnerPhone(data.owner_phone || ''); }
  };

  const fetchExpenses = async () => {
    const { data } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    if (data) {
        setExpenses(data);
        setTotalFixedCosts(data.filter(e => e.category === 'Fixed').reduce((sum, e) => sum + e.amount, 0));
        setTotalVariableCosts(data.filter(e => e.category === 'Variable').reduce((sum, e) => sum + e.amount, 0));
    }
  };

  const fetchStaff = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setStaffList(data);
  };

  const fetchStaffPerformance = async () => {
    const { data } = await supabase.from('orders').select('waiter_name, total_price').eq('status', 'paid');
    if (data) {
        const stats: Record<string, number> = {};
        data.forEach(o => {
            if (!o.waiter_name) return;
            stats[o.waiter_name] = (stats[o.waiter_name] || 0) + o.total_price;
        });
        const result = Object.entries(stats).map(([name, total]) => ({ name, total }));
        setWaiterStats(result);
    }
  };

  // --- ACTIONS ---
  const handleAddItem = async () => {
    if (!newItemName || !newItemPrice) return toast.error("Fill all fields");
    const lowLevel = parseInt(newItemLowLevel) || 5;
    const openingQty = parseInt(newItemOpening) || 0;

    const { error } = await supabase.from('menu_items').insert({ 
        name: newItemName, price: parseFloat(newItemPrice), emoji: '🍹', color: 'bg-purple-500', 
        stock_quantity: openingQty, opening_stock: openingQty, purchases: 0, low_stock_level: lowLevel, actual_stock: 0,
        category: newItemCategory, active: true
    });

    if (error) { toast.error(`Error: ${error.message}`); } 
    else {
        toast.success("Item Added!");
        setNewItemName(''); setNewItemPrice(''); setNewItemCategory('General'); setNewItemLowLevel('5'); setNewItemOpening('0');
        fetchMenuAndSales();
    }
  };

  const handleDeleteItem = async (id: string) => { await supabase.from('menu_items').delete().eq('id', id); toast.success("Deleted"); fetchMenuAndSales(); };
  
  const handleAddExpense = async () => {
    if (!newExpenseName || !newExpenseAmount) return toast.error("Fill expense details");
    await supabase.from('expenses').insert({ name: newExpenseName, amount: parseFloat(newExpenseAmount), category: newExpenseType });
    toast.success("Expense Added!"); setNewExpenseName(''); setNewExpenseAmount(''); fetchExpenses();
  };

  const handleDeleteExpense = async (id: string) => { await supabase.from('expenses').delete().eq('id', id); toast.success("Removed"); fetchExpenses(); };

  const getSalesForItem = (name: string) => (dailySales.find(s => s.name === name)?.quantity || 0);
  const calcExpected = (item: MenuItem) => Math.max(0, item.opening_stock + item.purchases - getSalesForItem(item.name));

  const handleUpdatePurchases = async (id: string, value: string) => {
    let purchases = Math.max(0, parseInt(value) || 0);
    const item = menuItems.find(i => i.id === id); if(!item) return;
    let newExpected = Math.max(0, item.opening_stock + purchases - getSalesForItem(item.name));
    setMenuItems(prev => prev.map(i => i.id === id ? { ...i, purchases, stock_quantity: newExpected } : i));
    await supabase.from('menu_items').update({ purchases, stock_quantity: newExpected }).eq('id', id);
  };

  const handleUpdateActual = async (id: string, value: string) => {
    let actual = Math.max(0, parseInt(value) || 0);
    setMenuItems(prev => prev.map(i => i.id === id ? { ...i, actual_stock: actual } : i));
    await supabase.from('menu_items').update({ actual_stock: actual }).eq('id', id);
  };
  
  const handleUpdateLowLevel = async (id: string, value: string) => {
    let level = Math.max(0, parseInt(value) || 0);
    setMenuItems(prev => prev.map(item => item.id === id ? { ...item, low_stock_level: level } : item));
    await supabase.from('menu_items').update({ low_stock_level: level }).eq('id', id);
  };

  const handleUpdateTableCount = async () => { await supabase.from('settings').update({ table_count: tableCount }).eq('id', 1); toast.success("Updated!"); };
  const handleUpdateOwnerPhone = async () => { await supabase.from('settings').update({ owner_phone: ownerPhone }).eq('id', 1); toast.success("Saved!"); };
  
  const handlePrintSales = () => { setPrintMode('sales'); setTimeout(() => window.print(), 100); };
  const handlePrintStock = () => { setPrintMode('stock'); setTimeout(() => window.print(), 100); };

  const handleEndOfDay = async () => {
    if(!confirm("End Shift?")) return;

    const dateStr = new Date().toLocaleDateString('en-KE');
    const msg = `📊 *SHIFT REPORT*\n📅 ${dateStr}\n\n💰 Sales: KES ${formatMoney(todaysSales)}\n💵 Cash: KES ${formatMoney(cashSales)}\n📱 M-Pesa: KES ${formatMoney(mpesaSales)}`;
    
    let phone = ownerPhone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '254' + phone.substring(1);
    if (phone.startsWith('7')) phone = '254' + phone;
    if(phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');

    setPrintMode('stock');
    setTimeout(() => window.print(), 200);

    const updates = menuItems.map(async (item) => {
        let expectedClosing = Math.max(0, item.opening_stock + item.purchases - getSalesForItem(item.name));
        await supabase.from('menu_items').update({ opening_stock: expectedClosing, purchases: 0, stock_quantity: expectedClosing, actual_stock: 0 }).eq('id', item.id);
    });
    await Promise.all(updates);
    toast.success("Shift Ended!");
    fetchMenuAndSales();
  };

  const handleSyncDatabase = async () => {
    if(!confirm("Sync DB?")) return;
    const updates = menuItems.map(async (item) => { await supabase.from('menu_items').update({ stock_quantity: calcExpected(item) }).eq('id', item.id); });
    await Promise.all(updates);
    toast.success("Synced!"); fetchMenuAndSales();
  };

  // --- STAFF ACTIONS ---
  const handleCreateStaff = async () => {
    if(!newStaffEmail || !newStaffPin || !newStaffName) return toast.error("Fill all staff fields");
    
    const res = await fetch('/api/create-user', {
        method: 'POST',
        body: JSON.stringify({ email: newStaffEmail, pin: newStaffPin, role: newStaffRole, fullName: newStaffName })
    });

    const json = await res.json();
    if(json.success) {
        toast.success("Staff Created! Pending Approval.");
        setNewStaffEmail(''); setNewStaffPin(''); setNewStaffName('');
        fetchStaff();
    } else {
        toast.error(json.error || "Error creating staff");
    }
  };

  if (!user || loading) return <div className="p-8 text-center">Loading...</div>;

  const dateStr = new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <>
      <div className="min-h-screen bg-gray-100 p-4 md:p-8 print:hidden">
        <div className="max-w-6xl mx-auto">
          
          {/* LOW STOCK ALERT BANNER */}
          {lowStockItems.length > 0 && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-xl shadow-sm" role="alert">
              <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">⚠️ Low Stock Alert ({lowStockItems.length} items)</p>
                    <p className="text-xs mt-1">
                        {lowStockItems.slice(0, 5).map(i => `${i.name} (${i.stock_quantity})`).join(', ')}
                        {lowStockItems.length > 5 && '...'}
                    </p>
                  </div>
                  <button onClick={() => setLowStockItems([])} className="text-red-500 hover:text-red-700 font-bold text-xs">DISMISS</button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-8">
            <div><h1 className="text-3xl font-extrabold text-gray-800">Admin Dashboard</h1><p className="text-gray-500">Inventory & Financials</p></div>
            <div className="flex gap-2 flex-wrap">
                {(role === 'owner' || role === 'admin') && (
                    <button onClick={() => router.push('/approvals')} className="bg-yellow-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-yellow-600">⚠️ Approvals</button>
                )}
                <button onClick={() => router.push('/kitchen')} className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700">🍳 Kitchen</button>
                <button onClick={() => router.push('/bar')} className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-orange-700">🥃 Bar</button>
                <button onClick={() => router.push('/')} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700">← POS</button>
                <button onClick={signOut} className="bg-red-100 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-200">Logout</button>
            </div>
          </div>

          {/* WAITER TRACKING */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border-l-4 border-blue-500">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Waiter Performance</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {waiterStats.length === 0 && <p className="text-gray-400 text-sm col-span-full">No sales data yet.</p>}
                {waiterStats.map(s => (
                    <div key={s.name} className="bg-gray-50 p-4 rounded-xl text-center border">
                        <p className="font-bold text-gray-800">{s.name}</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">KES {formatMoney(s.total)}</p>
                    </div>
                ))}
              </div>
          </div>

          {/* FINANCIALS */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border-l-4 border-indigo-500">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Profit & Loss</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                      <div className="flex justify-between items-end border-b pb-2">
                          <span className="text-gray-600">Revenue</span>
                          <span className="text-2xl font-bold text-green-600">KES {formatMoney(totalSales)}</span>
                      </div>
                      <div className="pl-4 space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between"><span>- Fixed</span><span className="font-bold text-red-500">KES {formatMoney(totalFixedCosts)}</span></div>
                          <div className="flex justify-between"><span>- Variable</span><span className="font-bold text-red-500">KES {formatMoney(totalVariableCosts)}</span></div>
                      </div>
                      <div className="flex justify-between items-end border-t-2 pt-2">
                          <span className="text-xl font-bold text-gray-800">Net Profit</span>
                          <span className={`text-3xl font-extrabold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>KES {formatMoney(netProfit)}</span>
                      </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl max-h-60 overflow-auto">
                       <h3 className="font-bold text-gray-700 mb-2 text-sm">Expenses</h3>
                       {expenses.length === 0 ? <p className="text-xs text-gray-400 text-center py-4">None</p> : 
                          <div className="space-y-2">
                              {expenses.slice(0, 10).map(exp => (
                                  <div key={exp.id} className="flex justify-between items-center text-xs bg-white p-2 rounded border">
                                      <div><span className="font-bold">{exp.name}</span></div>
                                      <div className="flex items-center gap-2">
                                          <span className="font-bold">KES {formatMoney(exp.amount)}</span>
                                          <button onClick={() => handleDeleteExpense(exp.id)} className="text-red-300 hover:text-red-500">✕</button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                       }
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                      <h3 className="font-bold text-gray-700 mb-3">Add Expense</h3>
                      <div className="space-y-2">
                          <input type="text" placeholder="Name" className="w-full p-2 border rounded-lg text-sm" value={newExpenseName} onChange={(e) => setNewExpenseName(e.target.value)} />
                          <input type="number" placeholder="Amount" className="w-full p-2 border rounded-lg text-sm" value={newExpenseAmount} onChange={(e) => setNewExpenseAmount(e.target.value)} />
                          <select className="w-full p-2 border rounded-lg text-sm bg-white" value={newExpenseType} onChange={(e) => setNewExpenseType(e.target.value)}>
                              {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <button onClick={handleAddExpense} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-indigo-700">Add</button>
                      </div>
                  </div>
              </div>
          </div>

          {/* CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* STOCK */}
            <div className="bg-white rounded-2xl shadow-sm p-6 overflow-x-auto">
                <div className="flex justify-between items-center mb-4">
                  <div><h2 className="text-xl font-bold text-gray-800">Stock Report</h2><p className="text-xs text-gray-400">Sales = Paid + Active</p></div>
                  <div className="flex gap-2">
                    <button onClick={handlePrintSales} className="bg-purple-600 text-white px-3 py-1 rounded-lg text-xs font-bold">🧾 Print Sales</button>
                    <button onClick={handlePrintStock} className="bg-gray-500 text-white px-3 py-1 rounded-lg text-xs font-bold">🖨️ Print Stock</button>
                    <button onClick={handleSyncDatabase} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold">Sync DB</button>
                    <button onClick={handleEndOfDay} className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold">End Shift 📱</button>
                  </div>
                </div>
                
                <table className="w-full text-xs min-w-[700px]">
                    <thead><tr className="border-b">
                        <th className="pb-2 text-left">Item</th><th className="pb-2 text-center">Op</th><th className="pb-2 text-center">+ Purch</th><th className="pb-2 text-center">- Sales</th><th className="pb-2 text-center">= Exp</th><th className="pb-2 text-center">Actual</th><th className="pb-2 text-center">Diff</th><th className="pb-2 text-center">Min</th>
                    </tr></thead>
                    <tbody>
                    {menuItems.map((item) => {
                        const sales = getSalesForItem(item.name);
                        const expected = calcExpected(item);
                        const variance = item.actual_stock - expected;
                        return (
                        <tr key={item.id} className={`border-b last:border-0 ${expected < item.low_stock_level ? 'bg-red-50' : ''}`}>
                            <td className="py-3 font-bold">{item.emoji} {item.name}<span className="ml-1 text-[9px] bg-gray-200 text-gray-600 px-1 rounded">{item.category}</span></td>
                            <td className="py-2 text-center text-gray-600">{item.opening_stock}</td>
                            <td className="py-1 text-center"><input type="number" min="0" className="w-12 p-1 border rounded text-center text-xs bg-green-50" value={item.purchases} onChange={(e) => handleUpdatePurchases(item.id, e.target.value)} /></td>
                            <td className="py-2 text-center font-bold text-blue-600">{sales}</td>
                            <td className="py-2 text-center font-bold text-white bg-blue-500">{expected}</td>
                            <td className="py-1 text-center"><input type="number" min="0" className="w-12 p-1 border rounded text-center text-xs" value={item.actual_stock} onChange={(e) => handleUpdateActual(item.id, e.target.value)} /></td>
                            <td className={`py-2 text-center font-bold text-xs ${variance === 0 ? 'text-gray-400' : (variance < 0 ? 'text-red-600' : 'text-green-600')}`}>{variance > 0 ? `+${variance}` : variance}</td>
                            <td className="py-1 text-center"><input type="number" min="0" className="w-12 p-1 border rounded text-center text-xs bg-yellow-50" value={item.low_stock_level} onChange={(e) => handleUpdateLowLevel(item.id, e.target.value)} /></td>
                        </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            {/* RIGHT SIDE: MENU & STAFF */}
            <div className="space-y-8">
                
                {/* STAFF MANAGEMENT */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Staff Management</h2>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4 text-sm">
                        <input type="text" placeholder="Name" className="p-2 border rounded" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} />
                        <input type="email" placeholder="Email" className="p-2 border rounded" value={newStaffEmail} onChange={e => setNewStaffEmail(e.target.value)} />
                        <input type="text" placeholder="PIN" className="p-2 border rounded" value={newStaffPin} onChange={e => setNewStaffPin(e.target.value)} />
                        <select className="p-2 border rounded bg-white" value={newStaffRole} onChange={e => setNewStaffRole(e.target.value)}>
                            <option value="waiter">Waiter</option>
                            <option value="barman">Barman</option>
                            <option value="admin">Admin</option>
                        </select>
                        <button onClick={handleCreateStaff} className="bg-blue-600 text-white rounded font-bold hover:bg-blue-700">ADD</button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-auto border rounded p-2">
                        {staffList.length === 0 && <p className="text-center text-gray-400 text-xs py-2">No staff found.</p>}
                        {staffList.map(s => (
                            <div key={s.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                                <div><span className="font-bold">{s.full_name || s.email}</span><span className="ml-2 text-xs text-gray-400 capitalize">({s.role})</span></div>
                                <span className={`text-xs px-2 py-1 rounded font-bold ${s.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.approved ? 'Active' : 'Pending'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MENU */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Item</h2>
                    <div className="flex flex-col gap-2 mb-4 border-b pb-4">
                        <div className="flex gap-2">
                            <input type="text" placeholder="Name" className="flex-1 p-2 border rounded-lg text-sm" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
                            <input type="number" placeholder="Price" className="w-20 p-2 border rounded-lg text-sm" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} />
                            <input type="number" placeholder="Op Qty" className="w-16 p-2 border rounded-lg text-sm" value={newItemOpening} onChange={(e) => setNewItemOpening(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                            <select className="flex-1 p-2 border rounded-lg text-sm bg-gray-50" value={newItemCategory} onChange={(e) => setNewItemCategory(e.target.value)}>
                                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                            <input type="number" placeholder="Min Lvl" className="w-16 p-2 border rounded-lg text-sm" value={newItemLowLevel} onChange={(e) => setNewItemLowLevel(e.target.value)} />
                            <button onClick={handleAddItem} className="bg-green-500 text-white px-6 py-2 rounded-lg font-bold text-sm">Add</button>
                        </div>
                    </div>
                    <h3 className="font-bold text-gray-700 mb-2 text-sm">Current Menu</h3>
                    <div className="space-y-2 max-h-40 overflow-auto">
                        {menuItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-sm">
                                <span>{item.emoji} {item.name} <span className="text-gray-400">(Min: {item.low_stock_level})</span></span>
                                <button onClick={() => handleDeleteItem(item.id)} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* SETTINGS */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Settings</h2>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <label className="text-sm font-bold text-gray-600 self-center w-24">Tables:</label>
                            <input type="number" className="p-2 border rounded-lg flex-1" value={tableCount} onChange={(e) => setTableCount(parseInt(e.target.value))} />
                            <button onClick={handleUpdateTableCount} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Save</button>
                        </div>
                        <div className="flex gap-2">
                            <label className="text-sm font-bold text-gray-600 self-center w-24">Owner Phone:</label>
                            <input type="text" placeholder="0722..." className="p-2 border rounded-lg flex-1 text-sm" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
                            <button onClick={handleUpdateOwnerPhone} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Save</button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- PRINTABLE LAYOUTS --- */}
      <div className="hidden print:block bg-white text-black w-full" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        {/* (Print layouts remain the same) */}
      </div>
    </>
  );
}