"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/utils';
import { logActivity } from '@/lib/logger';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [plan, setPlan] = useState('Basic');
  
  // Form State
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState('Stock Purchase');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const activePlan = localStorage.getItem('activePlan') || 'Basic';
    setPlan(activePlan);
    loadExpenses();
  }, []);

  const loadExpenses = () => {
    const data = JSON.parse(localStorage.getItem('business_expenses') || '[]');
    setExpenses(data.reverse()); // Show newest first
  };

  const handleAddExpense = () => {
    if (amount <= 0 || !description) return alert("Please fill in all fields");

    const newExpense = {
      id: Date.now(),
      date: date,
      category: category,
      description: description,
      amount: amount,
      recorded_by: localStorage.getItem('current_staff') || 'Admin'
    };

    const existing = JSON.parse(localStorage.getItem('business_expenses') || '[]');
    existing.push(newExpense);
    localStorage.setItem('business_expenses', JSON.stringify(existing));

    // Log Audit
    logActivity('SYSTEM', 'EXPENSE_RECORDED', `Recorded ${category}: ${description} - KES ${formatMoney(amount)}`, { amount, category });

    setShowModal(false);
    setAmount(0);
    setDescription('');
    loadExpenses();
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (plan !== 'Pro') {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Pro Feature</h1>
        <p className="text-gray-400 mb-6">Expense Management is available on Pro plans only.</p>
        <Link href="/pos" className="bg-blue-600 px-6 py-2 rounded">Back to Dashboard</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      
      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-sm border border-gray-600">
            <h2 className="text-xl font-bold mb-4 text-red-400">Record Expense</h2>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-gray-700 p-3 rounded mt-1">
                  <option>Stock Purchase</option>
                  <option>Salaries</option>
                  <option>Rent</option>
                  <option>Utilities (Water/Elec)</option>
                  <option>Maintenance</option>
                  <option>Miscellaneous</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs text-gray-400">Amount (KES)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full bg-gray-700 p-3 rounded mt-1" />
              </div>

              <div>
                <label className="text-xs text-gray-400">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-gray-700 p-3 rounded mt-1" />
              </div>

              <div>
                <label className="text-xs text-gray-400">Description / Note</label>
                <input type="text" placeholder="e.g. Buying Milk, Fixing AC" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-700 p-3 rounded mt-1" />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="w-full bg-gray-600 py-2 rounded">Cancel</button>
              <button onClick={handleAddExpense} className="w-full bg-red-600 py-2 rounded font-bold">Save Expense</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-red-400">Expense Management</h1>
            <p className="text-gray-400 text-sm">Track business costs</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowModal(true)} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm font-bold">+ Add Expense</button>
            <Link href="/pos" className="bg-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-500">Back</Link>
          </div>
        </header>

        {/* Summary Card */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-6 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-400">Total Expenses Recorded</p>
            <p className="text-3xl font-bold text-red-500">KES {formatMoney(totalExpenses)}</p>
          </div>
          <Link href="/reports" className="bg-purple-600 px-4 py-2 rounded text-sm">View Profit/Loss</Link>
        </div>

        {/* Expense List */}
        <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-700 border-b border-gray-600">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Category</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-gray-700">
                  <td className="p-3 text-gray-400">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="p-3 text-orange-400">{e.category}</td>
                  <td className="p-3">{e.description}</td>
                  <td className="p-3 text-right text-red-400 font-bold">- KES {formatMoney(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && (
            <div className="p-8 text-center text-gray-500">No expenses recorded yet.</div>
          )}
        </div>
      </div>
    </main>
  );
}