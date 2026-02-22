 "use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/utils';

export default function ReportsPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [plan, setPlan] = useState('Basic');
  const [activeTab, setActiveTab] = useState('overview'); // overview or audit

  useEffect(() => {
    const activePlan = localStorage.getItem('activePlan') || 'Basic';
    setPlan(activePlan);
    
    const history = JSON.parse(localStorage.getItem('sales_history') || '[]');
    setSales(history.reverse());

    const expData = JSON.parse(localStorage.getItem('business_expenses') || '[]');
    setExpenses(expData);
  }, []);

  // Calculations
  const totalSales = sales.filter(s => s.paymentMethod !== 'Reception Payment').reduce((sum, s) => sum + (s.total || 0), 0);
  const totalCash = sales.filter(s => s.paymentMethod === 'Cash').reduce((sum, s) => sum + (s.total || 0), 0);
  const totalMpesa = sales.filter(s => s.paymentMethod === 'M-Pesa').reduce((sum, s) => sum + (s.total || 0), 0);
  
  // NEW: Expense Totals
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // NEW: Net Profit
  const netProfit = totalSales - totalExpenses;

  if (plan === 'Basic') {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Feature Not Available</h1>
        <p className="text-gray-400 mb-6">Financial Reports are not available on the Basic plan.</p>
        <Link href="/pos" className="bg-blue-600 px-6 py-2 rounded">Back to Tables</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-purple-400">Financial Overview</h1>
          <Link href="/pos" className="bg-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-500">Back to Tables</Link>
        </header>

        {/* Overview Tab */}
        <div className="space-y-6">
            
            {/* Top Row: Revenue & Profit */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-green-900 p-4 rounded-xl border border-green-600">
                    <p className="text-sm text-gray-300">Total Revenue</p>
                    <p className="text-2xl font-bold">KES {formatMoney(totalSales)}</p>
                </div>
                <div className="bg-red-900 p-4 rounded-xl border border-red-600">
                    <p className="text-sm text-gray-300">Total Expenses</p>
                    <p className="text-2xl font-bold">- KES {formatMoney(totalExpenses)}</p>
                </div>
                <div className={`p-4 rounded-xl border ${netProfit >= 0 ? 'bg-blue-900 border-blue-600' : 'bg-gray-800 border-gray-600'}`}>
                    <p className="text-sm text-gray-300">Net Profit / Loss</p>
                    <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        KES {formatMoney(netProfit)}
                    </p>
                </div>
            </div>

            {/* Payment Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-600">
                <p className="text-xs text-gray-400">Cash Sales</p>
                <p className="text-xl font-bold text-white">KES {formatMoney(totalCash)}</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-600">
                <p className="text-xs text-gray-400">M-Pesa Sales</p>
                <p className="text-xl font-bold text-white">KES {formatMoney(totalMpesa)}</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-600">
                <p className="text-xs text-gray-400">Room Posts (Pending)</p>
                <p className="text-xl font-bold text-white">KES {formatMoney(sales.filter(s => s.paymentMethod === 'Room Charge').reduce((sum, s) => sum + s.total, 0))}</p>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="grid grid-cols-2 gap-4 mt-8">
                <Link href="/audit" className="block w-full bg-gray-700 hover:bg-gray-600 py-3 rounded font-bold text-center">
                    View Full Audit Trail
                </Link>
                <Link href="/expenses" className="block w-full bg-red-700 hover:bg-red-600 py-3 rounded font-bold text-center">
                    Manage Expenses
                </Link>
            </div>
        </div>
      </div>
    </main>
  );
}