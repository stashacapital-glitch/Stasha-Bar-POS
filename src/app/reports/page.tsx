 "use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

type DailySale = { date: string; total: number; orders: number };
type TopItem = { name: string; quantity: number; revenue: number };

export default function ReportsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  
  // Filters
  const [dateRange, setDateRange] = useState('7'); // Last 7 days

  useEffect(() => {
    if (!user) router.push('/login');
    if (user) fetchReportData();
  }, [user, dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    
    // 1. Total Stats
    const { data: orders } = await supabase.from('orders').select('total_price, created_at').eq('status', 'paid');
    if (orders) {
        setTotalOrders(orders.length);
        setTotalRevenue(orders.reduce((sum, o) => sum + o.total_price, 0));

        // Process Daily Sales for Chart
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));
        
        const recentOrders = orders.filter(o => new Date(o.created_at) >= daysAgo);
        
        // Group by Date
        const grouped: Record<string, { total: number; orders: number }> = {};
        recentOrders.forEach(o => {
            const date = new Date(o.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
            if (!grouped[date]) grouped[date] = { total: 0, orders: 0 };
            grouped[date].total += o.total_price;
            grouped[date].orders += 1;
        });
        
        setDailySales(Object.entries(grouped).map(([date, val]) => ({ date, ...val })).reverse());
    }

    // 2. Top Selling Items
    const { data: itemSales } = await supabase.from('order_items').select('name, quantity, price, orders!inner(status)').eq('orders.status', 'paid');
    if (itemSales) {
        const itemMap: Record<string, { quantity: number; revenue: number }> = {};
        itemSales.forEach((item: any) => {
            if (!itemMap[item.name]) itemMap[item.name] = { quantity: 0, revenue: 0 };
            itemMap[item.name].quantity += item.quantity;
            itemMap[item.name].revenue += (item.price * item.quantity);
        });
        
        const sorted = Object.entries(itemMap)
            .map(([name, val]) => ({ name, ...val }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
            
        setTopItems(sorted);
    }

    setLoading(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800">Business Reports</h1>
            <p className="text-gray-500">Financial Performance Overview</p>
          </div>
          <div className="flex gap-2">
            <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)}
                className="p-2 border rounded-lg text-sm bg-white"
            >
                <option value="1">Today</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="365">This Year</option>
            </select>
            <button onClick={() => router.push('/admin')} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700">← Admin</button>
            <button onClick={signOut} className="bg-red-100 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-200">Logout</button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-500">
            <p className="text-gray-500 text-sm uppercase font-bold">Total Revenue</p>
            <p className="text-4xl font-extrabold text-gray-800 mt-2">KES {totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-2">From {totalOrders} transactions</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm uppercase font-bold">Average Order Value</p>
            <p className="text-4xl font-extrabold text-gray-800 mt-2">KES {(totalOrders > 0 ? totalRevenue / totalOrders : 0).toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-2">Per bill</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-purple-500">
            <p className="text-gray-500 text-sm uppercase font-bold">Daily Average</p>
            <p className="text-4xl font-extrabold text-gray-800 mt-2">KES {(totalRevenue / (parseInt(dateRange) || 1)).toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-2">Last {dateRange} days</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Daily Sales Chart (Simple Bar Visualization) */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Sales Trend</h2>
                <div className="space-y-3">
                    {dailySales.length === 0 ? <p className="text-gray-400 text-center py-10">No data for this period</p> : 
                     dailySales.map((day, i) => {
                        const maxVal = Math.max(...dailySales.map(d => d.total), 1);
                        const widthPercent = (day.total / maxVal) * 100;
                        return (
                            <div key={i} className="flex items-end gap-2 h-8">
                                <span className="text-xs text-gray-500 w-12">{day.date}</span>
                                <div className="flex-1 bg-gray-100 rounded h-full relative">
                                    <div 
                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded"
                                        style={{ width: `${widthPercent}%` }}
                                    ></div>
                                    <span className="absolute right-2 top-1 text-xs font-bold text-gray-700 z-10">KES {day.total.toFixed(0)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Top Selling Items */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Top Sellers</h2>
                <div className="space-y-4">
                    {topItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>
                                {i + 1}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-gray-800">{item.name}</p>
                                <p className="text-xs text-gray-500">{item.quantity} sold</p>
                            </div>
                            <p className="font-bold text-gray-700">KES {item.revenue.toFixed(2)}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}