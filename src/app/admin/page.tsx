 "use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { getPlanConfig, PlanType, PlanFeatures } from '@/utils/plans'; 

// --- TYPES ---
type Order = { id: string; created_at: string; table_number: number; total_price: number; status: string; payment_method: string; waiter_name: string };
type MenuItem = { id: string; name: string; price: number; cost_price: number; emoji: string; color: string; stock_quantity: number; opening_stock: number; purchases: number; low_stock_level: number; category: string; active: boolean; actual_stock: number };
type Expense = { id: string; name: string; amount: number; category: string; created_at: string; receipt_url: string | null };
type DailySale = { name: string; quantity: number };
type Profile = { id: string; email: string; role: string; full_name: string; approved: boolean };
type WaiterStat = { name: string; total: number; commission: number };
type Room = { id: string; room_number: string; description: string; rate: number; type: string; status: string };

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
  
  const [cashSales, setCashSales] = useState(0);
  const [mpesaSales, setMpesaSales] = useState(0);
  const [printMode, setPrintMode] = useState<'sales' | 'stock'>('sales');

  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [waiterStats, setWaiterStats] = useState<WaiterStat[]>([]);
  const [lowStockItems, setLowStockItems] = useState<MenuItem[]>([]); 
  const [commissionRate, setCommissionRate] = useState(0);
  
  // PLAN & TAX STATE
  const [currentPlan, setCurrentPlan] = useState<PlanType>('pro');
  const [features, setFeatures] = useState<PlanFeatures>(getPlanConfig('pro').features);
  const [vatRate, setVatRate] = useState(0);
  const [hotelLevyRate, setHotelLevyRate] = useState(0);
  const [serviceChargeRate, setServiceChargeRate] = useState(0);
  
  const [totalVAT, setTotalVAT] = useState(0);
  const [totalLevy, setTotalLevy] = useState(0);
  const [totalServiceCharge, setTotalServiceCharge] = useState(0);
  const [totPayable, setTotPayable] = useState(0);
  const [corpTax, setCorpTax] = useState(0);
  
  const [totalCostOfGoodsSold, setTotalCostOfGoodsSold] = useState(0);
  const [grossProfit, setGrossProfit] = useState(0);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCost, setNewItemCost] = useState(''); 
  const [newItemCategory, setNewItemCategory] = useState('General');
  const [newItemLowLevel, setNewItemLowLevel] = useState('5');
  const [newItemOpening, setNewItemOpening] = useState('0');
  
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseType, setNewExpenseType] = useState('Variable');
  const [newExpenseFile, setNewExpenseFile] = useState<File | null>(null); 
  const [uploading, setUploading] = useState(false); 

  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('waiter');

  useEffect(() => { if (!user) router.push('/login'); if (user) fetchData(); }, [user]);
  useEffect(() => { setNetProfit(totalSales - (totalFixedCosts + totalVariableCosts)); }, [totalSales, totalFixedCosts, totalVariableCosts]);
  useEffect(() => {
    const gross = totalSales - totalCostOfGoodsSold; setGrossProfit(gross); setNetProfit(gross - (totalFixedCosts + totalVariableCosts));
    if (features.tax) setTotalVAT(totalSales * (vatRate / 100)); else setTotalVAT(0);
    if (features.hotel_levy) setTotalLevy(totalSales * (hotelLevyRate / 100)); else setTotalLevy(0);
    if (features.rooms) setTotalServiceCharge(totalSales * (serviceChargeRate / 100)); else setTotalServiceCharge(0);
    const monthlyEstimate = totalSales * 12;
    if (monthlyEstimate < 5000000) { setTotPayable(totalSales * 0.03); setCorpTax(0); } 
    else { setTotPayable(0); setCorpTax(Math.max(0, (gross - (totalFixedCosts + totalVariableCosts)) * 0.30)); }
  }, [totalSales, totalCostOfGoodsSold, totalFixedCosts, totalVariableCosts, vatRate, hotelLevyRate, serviceChargeRate, features]);

  // --- DATA FETCHING ---
  const fetchData = async () => { setLoading(true); await Promise.all([fetchDashboardData(), fetchMenuAndSales(), fetchSettings(), fetchExpenses(), fetchStaff(), fetchStaffPerformance()]); setLoading(false); };
  const fetchDashboardData = async () => {
    const { data: orders } = await supabase.from('orders').select('*').eq('status', 'paid').order('created_at', { ascending: false });
    if (orders) {
      setTotalSales(orders.reduce((sum, o) => sum + o.total_price, 0));
      const today = new Date().toDateString();
      const todaysOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
      setTodaysSales(todaysOrders.reduce((sum, o) => sum + o.total_price, 0));
      const cash = todaysOrders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + o.total_price, 0);
      const mpesa = todaysOrders.filter(o => o.payment_method === 'mpesa').reduce((sum, o) => sum + o.total_price, 0);
      setCashSales(cash); setMpesaSales(mpesa);
    }
  };
  const fetchMenuAndSales = async () => {
    const { data: menuData } = await supabase.from('menu_items').select('*').order('category').order('name');
    if (menuData) { setMenuItems(menuData); const lowItems = menuData.filter(item => item.stock_quantity <= item.low_stock_level); setLowStockItems(lowItems); }
    const today = new Date().toISOString().split('T')[0];
    const { data: paidItems } = await supabase.from('order_items').select('name, quantity, price, orders!inner(created_at, status)').eq('orders.status', 'paid').gte('orders.created_at', today);
    const salesMap: Record<string, number> = {}; let cogsTotal = 0;
    if (paidItems) {
        paidItems.forEach((item: any) => { salesMap[item.name] = (salesMap[item.name] || 0) + item.quantity; const menuItem = menuData?.find(m => m.name === item.name); if(menuItem) cogsTotal += menuItem.cost_price * item.quantity; });
        setTotalCostOfGoodsSold(cogsTotal);
    }
    setDailySales(Object.entries(salesMap).map(([name, quantity]) => ({ name, quantity })));
  };
  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('table_count, owner_phone, commission_rate, vat_rate, hotel_levy_rate, service_charge_rate, subscription_plan').eq('id', 1).single();
    if (data) { setTableCount(data.table_count); setOwnerPhone(data.owner_phone || ''); setCommissionRate(data.commission_rate || 0); setVatRate(data.vat_rate || 0); setHotelLevyRate(data.hotel_levy_rate || 0); setServiceChargeRate(data.service_charge_rate || 0); const plan = (data.subscription_plan || 'pro') as PlanType; setCurrentPlan(plan); setFeatures(getPlanConfig(plan).features); if (getPlanConfig(plan).features.rooms) fetchRooms(); }
  };
  const fetchExpenses = async () => {
    const { data } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    if (data) { setExpenses(data); setTotalFixedCosts(data.filter(e => e.category === 'Fixed').reduce((sum, e) => sum + e.amount, 0)); setTotalVariableCosts(data.filter(e => e.category === 'Variable').reduce((sum, e) => sum + e.amount, 0)); }
  };
  const fetchStaff = async () => { const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }); if (data) setStaffList(data); };
  const fetchStaffPerformance = async () => {
    const { data } = await supabase.from('orders').select('waiter_name, total_price').eq('status', 'paid');
    const { data: settings } = await supabase.from('settings').select('commission_rate').eq('id', 1).single();
    const rate = settings?.commission_rate || 0;
    if (data) { const stats: Record<string, number> = {}; data.forEach(o => { if (!o.waiter_name) return; stats[o.waiter_name] = (stats[o.waiter_name] || 0) + o.total_price; }); setWaiterStats(Object.entries(stats).map(([name, total]) => ({ name, total, commission: total * (rate / 100) }))); }
  };
  const fetchRooms = async () => { const { data } = await supabase.from('rooms').select('*').order('room_number'); if(data) setRooms(data); };

  // --- ACTIONS ---
  const handleAddItem = async () => {
    if (!newItemName || !newItemPrice) return toast.error("Fill all fields");
    const lowLevel = parseInt(newItemLowLevel) || 5; const openingQty = parseInt(newItemOpening) || 0; const cost = parseFloat(newItemCost) || 0;
    const { error } = await supabase.from('menu_items').insert({ name: newItemName, price: parseFloat(newItemPrice), cost_price: cost, emoji: '🍹', color: 'bg-purple-500', stock_quantity: openingQty, opening_stock: openingQty, purchases: 0, low_stock_level: lowLevel, actual_stock: 0, category: newItemCategory, active: true });
    if (error) toast.error(`Error: ${error.message}`); else { toast.success("Added!"); setNewItemName(''); setNewItemPrice(''); setNewItemCost(''); fetchMenuAndSales(); }
  };
  const handleDeleteItem = async (id: string) => { await supabase.from('menu_items').delete().eq('id', id); toast.success("Deleted"); fetchMenuAndSales(); };
  
  // --- EXPENSES WITH UPLOAD ---
  const handleAddExpense = async () => {
    if (!newExpenseName || !newExpenseAmount) return toast.error("Details missing");
    setUploading(true);
    
    let receiptUrl = null;
    
    if (newExpenseFile) {
        const fileExt = newExpenseFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage.from('invoices').upload(filePath, newExpenseFile);
        
        if (uploadError) { toast.error("Upload failed"); console.error(uploadError); setUploading(false); return; }
        
        const { data: publicUrl } = supabase.storage.from('invoices').getPublicUrl(filePath);
        receiptUrl = publicUrl.publicUrl;
    }
    
    const { error } = await supabase.from('expenses').insert({ 
        name: newExpenseName, 
        amount: parseFloat(newExpenseAmount), 
        category: newExpenseType, 
        receipt_url: receiptUrl 
    });
    
    if (error) toast.error("Failed to save");
    else { toast.success("Expense Added!"); setNewExpenseName(''); setNewExpenseAmount(''); setNewExpenseFile(null); fetchExpenses(); }
    setUploading(false);
  };

  const handleDeleteExpense = async (id: string, receiptUrl: string | null) => { 
      if (receiptUrl) {
          const fileName = receiptUrl.split('/').pop();
          if (fileName) await supabase.storage.from('invoices').remove([fileName]);
      }
      await supabase.from('expenses').delete().eq('id', id); 
      toast.success("Removed"); fetchExpenses(); 
  };

  const getSalesForItem = (name: string) => (dailySales.find(s => s.name === name)?.quantity || 0);
  const calcExpected = (item: MenuItem) => Math.max(0, item.opening_stock + item.purchases - getSalesForItem(item.name));
  const handleUpdatePurchases = async (id: string, value: string) => {
    let purchases = Math.max(0, parseInt(value) || 0); const item = menuItems.find(i => i.id === id); if(!item) return;
    let newExpected = Math.max(0, item.opening_stock + purchases - getSalesForItem(item.name));
    setMenuItems(prev => prev.map(i => i.id === id ? { ...i, purchases, stock_quantity: newExpected } : i));
    await supabase.from('menu_items').update({ purchases, stock_quantity: newExpected }).eq('id', id);
  };
  const handleUpdateActual = async (id: string, value: string) => { let actual = Math.max(0, parseInt(value) || 0); setMenuItems(prev => prev.map(i => i.id === id ? { ...i, actual_stock: actual } : i)); await supabase.from('menu_items').update({ actual_stock: actual }).eq('id', id); };
  const handleUpdateLowLevel = async (id: string, value: string) => { let level = Math.max(0, parseInt(value) || 0); setMenuItems(prev => prev.map(item => item.id === id ? { ...item, low_stock_level: level } : item)); await supabase.from('menu_items').update({ low_stock_level: level }).eq('id', id); };
  const handleUpdateTableCount = async () => { await supabase.from('settings').update({ table_count: tableCount }).eq('id', 1); toast.success("Saved"); };
  const handleUpdateCommissionRate = async () => { await supabase.from('settings').update({ commission_rate: commissionRate }).eq('id', 1); toast.success("Saved"); fetchStaffPerformance(); };
  const handleUpdateVAT = async () => { await supabase.from('settings').update({ vat_rate: vatRate }).eq('id', 1); toast.success("VAT Saved"); };
  const handleUpdateLevy = async () => { await supabase.from('settings').update({ hotel_levy_rate: hotelLevyRate }).eq('id', 1); toast.success("Levy Saved"); };
  const handleUpdateServiceCharge = async () => { await supabase.from('settings').update({ service_charge_rate: serviceChargeRate }).eq('id', 1); toast.success("Service Charge Saved"); };
  const handleUpdatePlan = async (newPlan: PlanType) => { await supabase.from('settings').update({ subscription_plan: newPlan }).eq('id', 1); setCurrentPlan(newPlan); setFeatures(getPlanConfig(newPlan).features); toast.success(`Plan: ${getPlanConfig(newPlan).name}`); fetchData(); };
  const handleUpdateOwnerPhone = async () => { await supabase.from('settings').update({ owner_phone: ownerPhone }).eq('id', 1); toast.success("Saved"); };
  const handlePrintSales = () => { setPrintMode('sales'); setTimeout(() => window.print(), 100); };
  const handlePrintStock = () => { setPrintMode('stock'); setTimeout(() => window.print(), 100); };
  const handleEndOfDay = async () => {
    if(!confirm("End Shift?")) return;
    const msg = `📊 *REPORT*\n💰 Sales: KES ${formatMoney(todaysSales)}\n💵 Cash: KES ${formatMoney(cashSales)}\n📱 M-Pesa: KES ${formatMoney(mpesaSales)}`;
    let phone = ownerPhone.replace(/\D/g, ''); if (phone.startsWith('0')) phone = '254' + phone.substring(1); if (phone.startsWith('7')) phone = '254' + phone;
    if(phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    setPrintMode('stock'); setTimeout(() => window.print(), 200);
    const updates = menuItems.map(async (item) => { let exp = Math.max(0, item.opening_stock + item.purchases - getSalesForItem(item.name)); await supabase.from('menu_items').update({ opening_stock: exp, purchases: 0, stock_quantity: exp, actual_stock: 0 }).eq('id', item.id); });
    await Promise.all(updates); toast.success("Done!"); fetchMenuAndSales();
  };
  const handleSyncDatabase = async () => { if(!confirm("Sync?")) return; const updates = menuItems.map(async (item) => { await supabase.from('menu_items').update({ stock_quantity: calcExpected(item) }).eq('id', item.id); }); await Promise.all(updates); toast.success("Synced"); fetchMenuAndSales(); };
  const handleCreateStaff = async () => {
    if(!newStaffEmail || !newStaffPin || !newStaffName) return toast.error("Fill fields");
    const res = await fetch('/api/create-user', { method: 'POST', body: JSON.stringify({ email: newStaffEmail, pin: newStaffPin, role: newStaffRole, fullName: newStaffName }) });
    const json = await res.json();
    if(json.success) { toast.success("Created!"); setNewStaffEmail(''); setNewStaffPin(''); setNewStaffName(''); fetchStaff(); } else toast.error(json.error || "Error");
  };
  const handleUpdateRoom = async (id: string, field: string, value: any) => { setRooms(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r)); await supabase.from('rooms').update({ [field]: value }).eq('id', id); toast.success("Room Updated"); };

  if (!user || loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <>
      <div className="min-h-screen bg-gray-100 p-4 md:p-8 print:hidden">
        <div className="max-w-6xl mx-auto">
          {lowStockItems.length > 0 && ( <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 mb-6 rounded-r-xl shadow-sm flex justify-between items-center"><div className="flex items-center gap-3"><span className="text-2xl">⚠️</span><div><p className="font-bold">Low Stock ({lowStockItems.length})</p><p className="text-xs">{lowStockItems.slice(0, 4).map(i => `${i.name} (${i.stock_quantity})`).join(', ')}...</p></div></div><button onClick={() => setLowStockItems([])} className="text-xs font-bold text-red-500 border px-2 py-1 rounded">DISMISS</button></div> )}

          <div className="flex justify-between items-center mb-8">
            <div><h1 className="text-3xl font-extrabold text-gray-800">Admin</h1><p className="text-gray-500">Plan: <span className="text-blue-600 font-bold">{getPlanConfig(currentPlan).name}</span></p></div>
            <div className="flex gap-2 flex-wrap">
                <button onClick={() => router.push('/reports')} className="bg-purple-700 text-white px-4 py-2 rounded-xl font-bold hover:bg-purple-800">📊 Reports</button>
                <button onClick={() => router.push('/payroll')} className="bg-teal-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-teal-700">💵 Payroll</button>
                {features.roles && (role === 'owner' || role === 'admin') && (<button onClick={() => router.push('/approvals')} className="bg-yellow-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-yellow-600">Approvals</button>)}
                {features.kitchen && (<button onClick={() => router.push('/kitchen')} className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700">🍳 Kitchen</button>)}
                {features.rooms && (<button onClick={() => router.push('/rooms')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700">🛏️ Rooms</button>)}
                <button onClick={() => router.push('/bar')} className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-orange-700">🥃 Bar</button>
                <button onClick={() => router.push('/')} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700">← POS</button>
                <button onClick={signOut} className="bg-red-100 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-200">Logout</button>
            </div>
          </div>

          {(features.tax || features.hotel_levy) && (
             <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border-l-4 border-red-500">
                <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Tax & Compliance Estimates</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    {features.tax && (<div className="bg-red-50 p-3 rounded-lg border"><p className="text-gray-500">VAT Liability</p><p className="text-xl font-bold text-red-600">KES {formatMoney(totalVAT)}</p><p className="text-[10px] text-gray-400 mt-1">Due by 9th</p></div>)}
                    {features.hotel_levy && (<div className="bg-red-50 p-3 rounded-lg border"><p className="text-gray-500">Hotel Levy</p><p className="text-xl font-bold text-red-600">KES {formatMoney(totalLevy)}</p><p className="text-[10px] text-gray-400 mt-1">Due by 20th</p></div>)}
                     {features.rooms && (<div className="bg-blue-50 p-3 rounded-lg border"><p className="text-gray-500">Service Charge</p><p className="text-xl font-bold text-blue-600">KES {formatMoney(totalServiceCharge)}</p><p className="text-[10px] text-gray-400 mt-1">Collected for Staff</p></div>)}
                    <div className="bg-gray-50 p-3 rounded-lg border">
                        <p className="text-gray-500">Income Tax Est.</p>
                        {totPayable > 0 ? (<><p className="text-xl font-bold text-orange-600">KES {formatMoney(totPayable)}</p><p className="text-[10px] text-gray-400 mt-1">TOT (3%)</p></>) : (<><p className="text-xl font-bold text-purple-600">KES {formatMoney(corpTax)}</p><p className="text-[10px] text-gray-400 mt-1">Corp Tax (30%)</p></>)}
                    </div>
                </div>
             </div>
          )}

          {features.waiters && (
             <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border-l-4 border-blue-500">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Waiter Performance</h2>
                    <div className="flex items-center gap-2 bg-green-50 p-2 rounded-lg border">
                        <span className="text-xs font-bold text-green-800">Commission (%):</span>
                        <input type="number" className="w-16 p-1 border rounded text-center text-sm" value={commissionRate} onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)} />
                        <button onClick={handleUpdateCommissionRate} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">Save</button>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {waiterStats.length === 0 && <p className="text-gray-400 text-sm col-span-full">No sales data yet.</p>}
                {waiterStats.map(s => (<div key={s.name} className="bg-gray-50 p-4 rounded-xl text-center border"><p className="font-bold text-gray-800">{s.name}</p><p className="text-xl font-bold text-green-600 mt-1">KES {formatMoney(s.total)}</p><div className="mt-2 pt-2 border-t border-dashed"><p className="text-xs text-gray-500">Commission</p><p className="text-md font-bold text-blue-600">KES {formatMoney(s.commission)}</p></div></div>))}
                </div>
             </div>
          )}

          {/* FINANCIALS */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border-l-4 border-indigo-500">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Financials</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                      <div className="flex justify-between items-end border-b pb-2"><span className="text-gray-600">Revenue</span><span className="text-2xl font-bold text-green-600">KES {formatMoney(totalSales)}</span></div>
                      {features.tax && (<div className="flex justify-between items-center text-sm text-gray-500 pl-4"><span>- VAT ({vatRate}%)</span><span className="font-bold text-red-500">KES {formatMoney(totalVAT)}</span></div>)}
                      {features.hotel_levy && (<div className="flex justify-between items-center text-sm text-gray-500 pl-4"><span>- Levy ({hotelLevyRate}%)</span><span className="font-bold text-red-500">KES {formatMoney(totalLevy)}</span></div>)}
                      {features.advanced_stock && (<div className="flex justify-between items-center text-sm text-gray-500 pl-4"><span>- COGS</span><span className="font-bold text-red-500">KES {formatMoney(totalCostOfGoodsSold)}</span></div>)}
                      <div className="flex justify-between items-end border-t pt-2"><span className="text-xl font-bold text-gray-800">Net Profit</span><span className={`text-3xl font-extrabold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>KES {formatMoney(netProfit)}</span></div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl max-h-60 overflow-auto">
                       <h3 className="font-bold text-gray-700 mb-2 text-sm">Expenses</h3>
                       {expenses.length === 0 ? <p className="text-xs text-gray-400 text-center py-4">None</p> : 
                          <div className="space-y-2">{expenses.slice(0, 10).map(exp => (
                              <div key={exp.id} className="flex justify-between items-center text-xs bg-white p-2 rounded border">
                                  <div className="flex items-center gap-2">
                                      <div>
                                        <span className="font-bold">{exp.name}</span>
                                        {exp.receipt_url && (<a href={exp.receipt_url} target="_blank" className="ml-2 text-blue-600 hover:underline">[View Doc]</a>)}
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <span className="font-bold">KES {formatMoney(exp.amount)}</span>
                                      <button onClick={() => handleDeleteExpense(exp.id, exp.receipt_url)} className="text-red-300 hover:text-red-500">✕</button>
                                  </div>
                              </div>
                          ))}</div>}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                      <h3 className="font-bold text-gray-700 mb-3">Add Expense</h3>
                      <div className="space-y-2">
                          <input type="text" placeholder="Name" className="w-full p-2 border rounded-lg text-sm" value={newExpenseName} onChange={(e) => setNewExpenseName(e.target.value)} />
                          <input type="number" placeholder="Amount" className="w-full p-2 border rounded-lg text-sm" value={newExpenseAmount} onChange={(e) => setNewExpenseAmount(e.target.value)} />
                          <select className="w-full p-2 border rounded-lg text-sm bg-white" value={newExpenseType} onChange={(e) => setNewExpenseType(e.target.value)}>{EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                          
                          {/* FILE UPLOAD */}
                          <div className="border border-dashed border-gray-300 rounded-lg p-2 text-center text-xs text-gray-500 cursor-pointer hover:bg-gray-100">
                            <label className="cursor-pointer">
                                <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => { if(e.target.files) setNewExpenseFile(e.target.files[0]) }} />
                                {newExpenseFile ? <span className="text-blue-600 font-bold">{newExpenseFile.name}</span> : <span>📎 Attach Invoice/Receipt</span>}
                            </label>
                          </div>

                          <button onClick={handleAddExpense} disabled={uploading} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">
                            {uploading ? "Uploading..." : "Add"}
                          </button>
                      </div>
                  </div>
              </div>
          </div>

          {/* STOCK */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-sm p-6 overflow-x-auto">
                <div className="flex justify-between items-center mb-4">
                  <div><h2 className="text-xl font-bold text-gray-800">Stock Report</h2></div>
                  <div className="flex gap-2">
                    <button onClick={handlePrintSales} className="bg-purple-600 text-white px-3 py-1 rounded-lg text-xs font-bold">Print Sales</button>
                    <button onClick={handlePrintStock} className="bg-gray-500 text-white px-3 py-1 rounded-lg text-xs font-bold">Print Stock</button>
                    <button onClick={handleSyncDatabase} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold">Sync DB</button>
                    <button onClick={handleEndOfDay} className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold">End Shift</button>
                  </div>
                </div>
                <table className="w-full text-xs min-w-[600px]">
                    <thead><tr className="border-b"><th className="pb-2 text-left">Item</th><th className="pb-2 text-center">Op</th><th className="pb-2 text-center">+P</th><th className="pb-2 text-center">-S</th><th className="pb-2 text-center">=Exp</th><th className="pb-2 text-center">Act</th><th className="pb-2 text-center">Diff</th>{features.advanced_stock && <th className="pb-2 text-center">Cost</th>}{features.advanced_stock && <th className="pb-2 text-center">Profit</th>}</tr></thead>
                    <tbody>
                    {menuItems.map((item) => {
                        const sales = getSalesForItem(item.name); const expected = calcExpected(item); const variance = item.actual_stock - expected;
                        return (
                        <tr key={item.id} className={`border-b ${expected < item.low_stock_level ? 'bg-red-50' : ''}`}>
                            <td className="py-3 font-bold">{item.emoji} {item.name}</td>
                            <td className="py-2 text-center text-gray-600">{item.opening_stock}</td>
                            <td className="py-1 text-center"><input type="number" min="0" className="w-10 p-1 border rounded text-center text-xs bg-green-50" value={item.purchases} onChange={(e) => handleUpdatePurchases(item.id, e.target.value)} /></td>
                            <td className="py-2 text-center font-bold text-blue-600">{sales}</td>
                            <td className="py-2 text-center font-bold text-white bg-blue-500">{expected}</td>
                            <td className="py-1 text-center"><input type="number" min="0" className="w-10 p-1 border rounded text-center text-xs" value={item.actual_stock} onChange={(e) => handleUpdateActual(item.id, e.target.value)} /></td>
                            <td className={`py-2 text-center font-bold text-xs ${variance === 0 ? 'text-gray-400' : (variance < 0 ? 'text-red-600' : 'text-green-600')}`}>{variance > 0 ? `+${variance}` : variance}</td>
                            {features.advanced_stock && <td className="py-2 text-center text-xs">{formatMoney(item.cost_price)}</td>}
                            {features.advanced_stock && <td className="py-2 text-center text-xs font-bold text-green-600">{formatMoney(item.price - item.cost_price)}</td>}
                        </tr>);
                    })}
                    </tbody>
                </table>
            </div>

            {/* RIGHT SIDE */}
            <div className="space-y-8">
                {features.roles && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 border">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Staff</h2>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4 text-sm">
                            <input type="text" placeholder="Name" className="p-2 border rounded" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} />
                            <input type="email" placeholder="Email" className="p-2 border rounded" value={newStaffEmail} onChange={e => setNewStaffEmail(e.target.value)} />
                            <input type="text" placeholder="PIN" className="p-2 border rounded" value={newStaffPin} onChange={e => setNewStaffPin(e.target.value)} />
                            <select className="p-2 border rounded bg-white" value={newStaffRole} onChange={e => setNewStaffRole(e.target.value)}><option value="waiter">Waiter</option><option value="barman">Barman</option><option value="admin">Admin</option></select>
                            <button onClick={handleCreateStaff} className="bg-blue-600 text-white rounded font-bold hover:bg-blue-700">ADD</button>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-auto border rounded p-2">
                            {staffList.length === 0 && <p className="text-center text-gray-400 text-xs py-2">No staff.</p>}
                            {staffList.map(s => (<div key={s.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"><div><span className="font-bold">{s.full_name || s.email}</span><span className="ml-2 text-xs text-gray-400 capitalize">({s.role})</span></div><span className={`text-xs px-2 py-1 rounded font-bold ${s.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.approved ? 'Active' : 'Pending'}</span></div>))}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Add Item</h2>
                    <div className="flex flex-col gap-2 mb-4 border-b pb-4">
                        <div className="flex gap-2">
                            <input type="text" placeholder="Name" className="flex-1 p-2 border rounded-lg text-sm" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
                            <input type="number" placeholder="Price" className="w-20 p-2 border rounded-lg text-sm" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} />
                            {features.advanced_stock && <input type="number" placeholder="Cost" className="w-20 p-2 border rounded-lg text-sm" value={newItemCost} onChange={(e) => setNewItemCost(e.target.value)} />}
                        </div>
                        <div className="flex gap-2">
                            <input type="number" placeholder="Qty" className="w-16 p-2 border rounded-lg text-sm" value={newItemOpening} onChange={(e) => setNewItemOpening(e.target.value)} />
                            <select className="flex-1 p-2 border rounded-lg text-sm bg-gray-50" value={newItemCategory} onChange={(e) => setNewItemCategory(e.target.value)}>{CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                            <button onClick={handleAddItem} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm">Add</button>
                        </div>
                    </div>
                    <h3 className="font-bold text-gray-700 mb-2 text-sm">Menu</h3>
                    <div className="space-y-2 max-h-40 overflow-auto">{menuItems.map((item) => (<div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-sm"><span>{item.emoji} {item.name}</span><button onClick={() => handleDeleteItem(item.id)} className="text-red-400 hover:text-red-600 text-xs">Delete</button></div>))}</div>
                </div>
                
                {features.rooms && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-indigo-100">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">🛏️ Room Configuration</h2>
                        <div className="space-y-2 text-xs overflow-auto max-h-60">
                            {rooms.map(room => (
                                <div key={room.id} className="grid grid-cols-3 gap-2 items-center bg-gray-50 p-2 rounded border">
                                    <input type="text" className="font-bold p-1 border rounded text-center" value={room.room_number} onChange={(e) => handleUpdateRoom(room.id, 'room_number', e.target.value)} />
                                    <input type="text" placeholder="Desc" className="p-1 border rounded" value={room.description || ''} onChange={(e) => handleUpdateRoom(room.id, 'description', e.target.value)} />
                                    <input type="number" placeholder="Rate" className="p-1 border rounded text-right" value={room.rate} onChange={(e) => handleUpdateRoom(room.id, 'rate', parseFloat(e.target.value) || 0)} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Settings</h2>
                    <div className="space-y-4">
                        {role === 'owner' && (
                            <div className="flex gap-2 border-b pb-4 mb-4 bg-yellow-50 p-3 rounded-lg border">
                                <label className="text-sm font-bold text-gray-700 self-center w-28">Active Plan:</label>
                                <select className="p-2 border rounded-lg flex-1 text-sm" value={currentPlan} onChange={(e) => handleUpdatePlan(e.target.value as PlanType)}>
                                    <option value="basic">Basic</option>
                                    <option value="regular">Regular</option>
                                    <option value="standard">Standard</option>
                                    <option value="pro">Pro (Hotel)</option>
                                </select>
                            </div>
                        )}
                        {features.tax && (<div className="flex gap-2"><label className="text-sm font-bold text-gray-600 self-center w-28">VAT (%):</label><input type="number" className="p-2 border rounded-lg flex-1 text-sm" value={vatRate} onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)} /><button onClick={handleUpdateVAT} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Save</button></div>)}
                        {features.hotel_levy && (<div className="flex gap-2"><label className="text-sm font-bold text-gray-600 self-center w-28">Levy (%):</label><input type="number" className="p-2 border rounded-lg flex-1 text-sm" value={hotelLevyRate} onChange={(e) => setHotelLevyRate(parseFloat(e.target.value) || 0)} /><button onClick={handleUpdateLevy} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Save</button></div>)}
                        {features.rooms && (<div className="flex gap-2"><label className="text-sm font-bold text-gray-600 self-center w-28">Srv Chrg (%):</label><input type="number" className="p-2 border rounded-lg flex-1 text-sm" value={serviceChargeRate} onChange={(e) => setServiceChargeRate(parseFloat(e.target.value) || 0)} /><button onClick={handleUpdateServiceCharge} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Save</button></div>)}
                        
                        <div className="flex gap-2"><label className="text-sm font-bold text-gray-600 self-center w-28">Tables:</label><input type="number" className="p-2 border rounded-lg flex-1 text-sm" value={tableCount} onChange={(e) => setTableCount(parseInt(e.target.value))} /><button onClick={handleUpdateTableCount} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Save</button></div>
                         <div className="flex gap-2"><label className="text-sm font-bold text-gray-600 self-center w-28">Owner Phone:</label><input type="text" placeholder="0722..." className="p-2 border rounded-lg flex-1 text-sm" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} /><button onClick={handleUpdateOwnerPhone} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Save</button></div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}