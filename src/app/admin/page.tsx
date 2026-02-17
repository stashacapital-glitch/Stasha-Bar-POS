"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

type Order = {
  id: string;
  created_at: string;
  table_number: number;
  total_price: number;
  status: string;
};

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  
  const [totalSales, setTotalSales] = useState(0);
  const [todaysSales, setTodaysSales] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);

    // 1. Fetch all paid orders
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'paid')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Failed to fetch data");
    } else if (orders) {
      // Calculate Total Sales (All Time)
      const total = orders.reduce((sum, order) => sum + order.total_price, 0);
      setTotalSales(total);

      // Calculate Today's Sales
      const today = new Date().toDateString();
      const todaysOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
      const todaysTotal = todaysOrders.reduce((sum, order) => sum + order.total_price, 0);
      setTodaysSales(todaysTotal);

      // Set Recent Orders (last 10)
      setRecentOrders(orders.slice(0, 10));
    }
    
    setLoading(false);
  };

  if (!user || loading) return <div className="p-8 text-center">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-500">Business Overview</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => router.push('/')} 
              className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700"
            >
              ← Back to POS
            </button>
            <button 
              onClick={signOut} 
              className="bg-red-100 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-200"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-500">
            <p className="text-gray-500 text-sm uppercase font-bold">Today's Sales</p>
            <p className="text-3xl font-extrabold text-gray-800 mt-2">KES {todaysSales.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm uppercase font-bold">Total Revenue (All Time)</p>
            <p className="text-3xl font-extrabold text-gray-800 mt-2">KES {totalSales.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-purple-500">
            <p className="text-gray-500 text-sm uppercase font-bold">Total Transactions</p>
            <p className="text-3xl font-extrabold text-gray-800 mt-2">{recentOrders.length}</p>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 text-sm font-bold text-gray-600">Date & Time</th>
                  <th className="pb-3 text-sm font-bold text-gray-600">Table</th>
                  <th className="pb-3 text-sm font-bold text-gray-600">Amount</th>
                  <th className="pb-3 text-sm font-bold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 text-sm text-gray-700">
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 text-sm text-gray-700 font-medium">
                      Table {order.table_number}
                    </td>
                    <td className="py-3 text-sm text-gray-900 font-bold">
                      KES {order.total_price.toFixed(2)}
                    </td>
                    <td className="py-3 text-sm">
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        PAID
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}