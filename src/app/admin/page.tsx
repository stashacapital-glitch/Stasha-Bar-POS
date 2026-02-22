 'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { getPlanConfig, PlanType, PlanFeatures } from '@/utils/plans';

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ sales: 0, orders: 0 });
  
  // Initialize Supabase client
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    
    // Example: Fetch today's sales
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('orders')
      .select('total_price')
      .gte('created_at', today);

    if (error) {
      console.error('Error fetching stats:', error);
    } else {
      const totalSales = data?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;
      setStats({ sales: totalSales, orders: data?.length || 0 });
    }
    
    setLoading(false);
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold text-orange-400 mb-6">Admin Dashboard</h1>

      {loading ? (
        <p>Loading stats...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-lg font-bold text-gray-400">Today's Sales</h2>
            <p className="text-3xl font-bold text-green-400">KES {stats.sales.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-lg font-bold text-gray-400">Transactions</h2>
            <p className="text-3xl font-bold text-blue-400">{stats.orders}</p>
          </div>
        </div>
      )}

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Management</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <button onClick={() => router.push('/admin/menu')} className="bg-gray-700 p-4 rounded hover:bg-gray-600">Menu</button>
           <button onClick={() => router.push('/admin/staff')} className="bg-gray-700 p-4 rounded hover:bg-gray-600">Staff</button>
           <button onClick={() => router.push('/admin/reports')} className="bg-gray-700 p-4 rounded hover:bg-gray-600">Reports</button>
           <button onClick={() => router.push('/admin/settings')} className="bg-gray-700 p-4 rounded hover:bg-gray-600">Settings</button>
        </div>
      </div>
    </div>
  );
}