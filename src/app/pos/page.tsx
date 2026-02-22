 "use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/utils';
import { processQueue } from '@/lib/offline';

export default function PosDashboard() {
  const [plan, setPlan] = useState('Basic');
  const [tables, setTables] = useState<any[]>([]);
  const [staffName, setStaffName] = useState('Waiter 1');
  const [notification, setNotification] = useState(0);
  const [syncStatus, setSyncStatus] = useState('');
  const [activeShift, setActiveShift] = useState<any>(null);
  
  // NEW: Dashboard Stats State
  const [stats, setStats] = useState({ sales: 0, tips: 0, transactions: 0 });

  const router = useRouter();

  useEffect(() => {
    const savedStaff = localStorage.getItem('current_staff') || 'Waiter 1';
    setStaffName(savedStaff);
    const activePlan = localStorage.getItem('activePlan') || 'Basic';
    setPlan(activePlan);
  }, []);

  useEffect(() => {
    const loadData = () => {
      const limits: { [key: string]: number } = { 'Basic': 5, 'Standard': 10, 'Regular': 15, 'Pro': 30 };
      const currentPlan = localStorage.getItem('activePlan') || 'Basic';
      const limit = limits[currentPlan] || 5;
      
      const savedTables = localStorage.getItem('pos_tables_data');
      let allTables = savedTables ? JSON.parse(savedTables) : [];

      if (allTables.length < limit) {
        for (let i = allTables.length; i < limit; i++) { allTables.push({ id: i + 1, total: 0, status: 'open' }); }
      } else if (allTables.length > limit) { allTables = allTables.slice(0, limit); }
      
      setTables(allTables);
      const myReadyOrders = allTables.filter((t: any) => t.status === 'ready' && t.waiter === staffName).length;
      setNotification(myReadyOrders);

      // Shift Status
      const shift = localStorage.getItem('active_shift');
      if (shift) setActiveShift(JSON.parse(shift));
      else setActiveShift(null);

      // NEW: Calculate Stats
      calculateStats();
    };

    loadData();
    
    const syncNow = async () => {
      const result = await processQueue();
      if (result && result.success > 0) setSyncStatus(`Synced ${result.success} records`);
      else if (result && result.failed > 0) setSyncStatus('Offline: Pending Sync');
    };
    
    syncNow();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [staffName]);

  // NEW: Stats Calculation Function
  const calculateStats = () => {
    const history = JSON.parse(localStorage.getItem('sales_history') || '[]');
    const today = new Date().toDateString();
    
    // Filter sales for today AND by current staff (if shift is active)
    // Or just all sales today if manager view?
    // Let's show all sales today for the dashboard overview.
    const todaysSales = history.filter((s: any) => new Date(s.date).toDateString() === today);

    const totalSales = todaysSales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
    const totalTips = todaysSales.reduce((sum: number, s: any) => sum + (s.tip || 0), 0);
    
    setStats({
      sales: totalSales,
      tips: totalTips,
      transactions: todaysSales.length
    });
  };

  const logout = () => { localStorage.removeItem('activePlan'); router.push('/'); };
  const handleStaffChange = (name: string) => { localStorage.setItem('current_staff', name); setStaffName(name); };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        
        <header className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-gray-700 pb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-orange-500">Dashboard</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">Staff:</span>
              <select value={staffName} onChange={(e) => handleStaffChange(e.target.value)} className="bg-gray-800 text-orange-400 text-sm p-1 rounded border border-gray-600">
                <option>Waiter 1</option><option>Waiter 2</option><option>Barman</option><option>Captain</option>
              </select>
              
              <Link href="/shift" className="text-xs ml-4">
                {activeShift ? (
                   <span className="flex items-center gap-1 text-green-400"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Shift Active</span>
                ) : (
                   <span className="flex items-center gap-1 text-red-400"><span className="w-2 h-2 bg-red-400 rounded-full"></span> Shift Closed</span>
                )}
              </Link>
              {syncStatus && <span className="text-[10px] text-blue-400 ml-2">({syncStatus})</span>}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center justify-center">
            <Link href="/shift" className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-xs font-bold border border-gray-600">My Shift</Link>

            {notification > 0 && ( <Link href="/notifications" className="relative bg-red-600 px-3 py-1.5 rounded text-xs font-bold animate-pulse flex items-center gap-2"> 🔔 Ready ({notification}) </Link> )}

            {(plan === 'Regular' || plan === 'Pro') && (
              <> <Link href="/kitchen" className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-xs font-bold">Kitchen</Link> <Link href="/menu" className="bg-pink-600 hover:bg-pink-700 px-3 py-1.5 rounded text-xs font-bold">Menu</Link> </> )}
            
            {plan !== 'Basic' && (
              <> <Link href="/inventory" className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1.5 rounded text-xs font-bold text-black">Inventory</Link> <Link href="/reports" className="bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded text-xs font-bold">Reports</Link> </> )}

            {plan === 'Pro' && (
              <>
                <Link href="/rooms" className="bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded text-xs font-bold">Rooms</Link>
                <Link href="/expenses" className="bg-orange-500 hover:bg-orange-400 px-3 py-1.5 rounded text-xs font-bold text-black">Expenses</Link>
                <Link href="/audit" className="bg-red-800 hover:bg-red-700 px-3 py-1.5 rounded text-xs font-bold border border-red-400">Audit</Link>
              </>
            )}

            <Link href="/settings" className="bg-gray-600 hover:bg-gray-500 px-3 py-1.5 rounded text-xs font-bold">Settings</Link>
            <button onClick={logout} className="bg-red-900 hover:bg-red-700 px-3 py-1.5 rounded text-xs">Exit</button>
          </div>
        </header>

        {/* NEW: Stats Overview Bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Today's Sales</p>
              <p className="text-xl font-bold text-green-400">KES {formatMoney(stats.sales)}</p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Transactions</p>
              <p className="text-xl font-bold text-blue-400">{stats.transactions}</p>
            </div>
            <div className="text-3xl">🧾</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Tips Collected</p>
              <p className="text-xl font-bold text-purple-400">KES {formatMoney(stats.tips)}</p>
            </div>
            <div className="text-3xl">🙏</div>
          </div>
        </div>

        {/* Table Grid Header */}
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-300">Floor Plan</h2>
            <p className="text-xs text-gray-500">{tables.filter(t => t.status !== 'open').length} Active Tables</p>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
          {tables.map((table) => {
            let cardClass = "bg-gray-800 border-gray-700 hover:border-orange-500";
            let statusText = "OPEN"; let statusClass = "bg-green-600";

            if (table.status === 'ready') { cardClass = "bg-green-800 border-green-400 animate-pulse ring-4 ring-green-500"; statusText = "READY!"; statusClass = "bg-white text-green-800 animate-bounce"; }
            else if (table.status === 'pending') { cardClass = "bg-yellow-900 border-yellow-500"; statusText = "KITCHEN"; statusClass = "bg-yellow-400 text-black"; }
            else if (table.status === 'occupied') { cardClass = "bg-red-900 border-red-500"; statusText = "OCCUPIED"; statusClass = "bg-red-600"; }

            return (
              <Link key={table.id} href={`/table/${table.id}`} className={`p-6 rounded-lg flex flex-col items-center justify-center aspect-square shadow-lg border-2 transition-all ${cardClass}`}>
                <h2 className="text-2xl font-bold">Table {table.id}</h2>
                <p className="text-xl font-bold mt-2 text-orange-400"> KES {formatMoney(table.total)} </p>
                <span className={`text-xs mt-2 px-2 py-0.5 rounded font-bold ${statusClass}`}> {statusText} </span>
                {table.waiter && <span className="text-[10px] text-gray-300 mt-1">{table.waiter}</span>}
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}