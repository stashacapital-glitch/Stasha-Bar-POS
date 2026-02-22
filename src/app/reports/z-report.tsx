 "use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/utils';

export default function ReportsPage() {
  const [plan, setPlan] = useState('Basic');
  const [sales, setSales] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [netProfit, setNetProfit] = useState(0);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ name: '', amount: 0, type: 'variable' });

  // Payment Method State
  const [cashSales, setCashSales] = useState(0);
  const [mpesaSales, setMpesaSales] = useState(0);
  const [cardSales, setCardSales] = useState(0);

  useEffect(() => {
    const activePlan = localStorage.getItem('activePlan') || 'Basic';
    setPlan(activePlan);

    // 1. Load Sales History
    const history = JSON.parse(localStorage.getItem('sales_history') || '[]');
    setSales(history);
    
    // Calculate Totals
    const total = history.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0);
    setTotalRevenue(total);

    // Calculate Payment Methods
    const cash = history.filter((s: any) => s.paymentMethod === 'Cash').reduce((sum: number, s: any) => sum + (s.total || 0), 0);
    const mpesa = history.filter((s: any) => s.paymentMethod === 'M-Pesa').reduce((sum: number, s: any) => sum + (s.total || 0), 0);
    const card = history.filter((s: any) => s.paymentMethod === 'Card').reduce((sum: number, s: any) => sum + (s.total || 0), 0);
    
    setCashSales(cash);
    setMpesaSales(mpesa);
    setCardSales(card);

    // 2. Calculate Top Items
    const itemCounts: { [key: string]: number } = {};
    history.forEach((sale: any) => {
      sale.items.forEach((item: any) => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.qty;
      });
    });
    const sortedItems = Object.entries(itemCounts).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);
    setTopItems(sortedItems);

    // 3. Load Expenses
    const savedExpenses = JSON.parse(localStorage.getItem('expenses_data') || '[]');
    setExpenses(savedExpenses);

  }, []);

  // Calculate Net Profit
  useEffect(() => {
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    setNetProfit(totalRevenue - totalExpenses);
  }, [totalRevenue, expenses]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.name || newExpense.amount <= 0) return;
    const expenseToAdd = { id: Date.now(), ...newExpense, date: new Date().toLocaleDateString() };
    const updatedExpenses = [...expenses, expenseToAdd];
    setExpenses(updatedExpenses);
    localStorage.setItem('expenses_data', JSON.stringify(updatedExpenses));
    setNewExpense({ name: '', amount: 0, type: 'variable' });
    setShowExpenseForm(false);
  };

  const deleteExpense = (id: number) => {
    const updated = expenses.filter(exp => exp.id !== id);
    setExpenses(updated);
    localStorage.setItem('expenses_data', JSON.stringify(updated));
  };

  if (plan === 'Basic' || plan === 'Standard') {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Upgrade Required</h1>
        <p className="text-gray-400 mb-8">Financial Reports are available on Regular and Pro plans.</p>
        <Link href="/" className="bg-blue-600 px-6 py-2 rounded-lg">Back to Dashboard</Link>
      </main>
    );
  }

  const fixedCosts = expenses.filter(e => e.type === 'fixed').reduce((s, e) => s + e.amount, 0);
  const variableCosts = expenses.filter(e => e.type === 'variable').reduce((s, e) => s + e.amount, 0);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-700 pb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-purple-400">Financial Overview</h1>
            <p className="text-gray-400 text-sm">Revenue, Expenses, and Net Profit</p>
          </div>
          <div className="flex gap-3">
            <Link href="/reports/z-report" className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm font-bold text-white">
              Close Shift (Z-Report)
            </Link>
            <Link href="/" className="bg-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-500">Back to Dashboard</Link>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-green-900/50 border border-green-700 p-4 rounded-lg col-span-2 md:col-span-1">
            <p className="text-green-300 text-xs uppercase">Total Revenue</p>
            <h2 className="text-2xl font-bold">KES {formatMoney(totalRevenue)}</h2>
          </div>
          <div className="bg-gray-800 border border-gray-600 p-4 rounded-lg">
            <p className="text-gray-400 text-xs uppercase">Cash Sales</p>
            <h2 className="text-xl font-bold text-white">KES {formatMoney(cashSales)}</h2>
          </div>
          <div className="bg-gray-800 border border-gray-600 p-4 rounded-lg">
            <p className="text-gray-400 text-xs uppercase">M-Pesa Sales</p>
            <h2 className="text-xl font-bold text-blue-400">KES {formatMoney(mpesaSales)}</h2>
          </div>
          <div className="bg-gray-800 border border-gray-600 p-4 rounded-lg">
            <p className="text-gray-400 text-xs uppercase">Card Sales</p>
            <h2 className="text-xl font-bold text-purple-400">KES {formatMoney(cardSales)}</h2>
          </div>
          <div className={`${netProfit >= 0 ? 'bg-purple-900/50 border-purple-700' : 'bg-red-900/50 border-red-700'} border p-4 rounded-lg`}>
            <p className={`${netProfit >= 0 ? 'text-purple-300' : 'text-red-300'} text-xs uppercase`}>Net Profit</p>
            <h2 className="text-2xl font-bold">KES {formatMoney(netProfit)}</h2>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Expense Manager */}
          <div className="md:col-span-1 bg-gray-800 p-6 rounded-xl border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-red-400">Expenses</h3>
              <button onClick={() => setShowExpenseForm(!showExpenseForm)} className="text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-500">+ Add Cost</button>
            </div>

            {showExpenseForm && (
              <form onSubmit={handleAddExpense} className="bg-gray-900 p-4 rounded mb-4 border border-gray-600 space-y-3">
                <input type="text" placeholder="Cost Name" value={newExpense.name} onChange={(e) => setNewExpense({...newExpense, name: e.target.value})} className="w-full bg-gray-800 p-2 rounded border border-gray-600 text-sm" required />
                <input type="number" placeholder="Amount" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: Number(e.target.value)})} className="w-full bg-gray-800 p-2 rounded border border-gray-600 text-sm" required />
                <select value={newExpense.type} onChange={(e) => setNewExpense({...newExpense, type: e.target.value})} className="w-full bg-gray-800 p-2 rounded border border-gray-600 text-sm">
                  <option value="fixed">Fixed Cost</option>
                  <option value="variable">Variable Cost</option>
                </select>
                <button type="submit" className="w-full bg-green-600 py-2 rounded text-sm font-bold">Save Expense</button>
              </form>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {expenses.length === 0 && <p className="text-gray-500 text-center text-sm">No costs recorded.</p>}
              {expenses.map((exp) => (
                <div key={exp.id} className="bg-gray-700 p-2 rounded flex justify-between items-center text-sm">
                  <div>
                    <p className="font-bold">{exp.name}</p>
                    <p className={`text-xs ${exp.type === 'fixed' ? 'text-blue-400' : 'text-yellow-400'}`}>{exp.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-300">-{formatMoney(exp.amount)}</span>
                    <button onClick={() => deleteExpense(exp.id)} className="text-red-500 hover:text-red-300 text-xs">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Selling & Recent */}
          <div className="md:col-span-2 space-y-8">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-xl font-bold mb-4 text-orange-400">Top Selling Items</h3>
              {topItems.length === 0 ? <p className="text-gray-500">No sales data yet.</p> : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {topItems.map((item, idx) => (
                    <div key={idx} className="bg-gray-700 p-3 rounded text-center">
                      <p className="font-bold text-sm truncate">{item.name}</p>
                      <p className="text-orange-400 font-bold text-lg">{item.qty}</p>
                      <p className="text-xs text-gray-400">sold</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-xl font-bold mb-4 text-blue-400">Recent Transactions</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sales.slice().reverse().slice(0, 5).map((sale, idx) => (
                  <div key={idx} className="border-b border-gray-700 pb-2 flex justify-between items-center">
                    <div>
                      <span className="text-sm text-gray-400">Table {sale.tableId}</span>
                      <span className="text-xs text-gray-500 ml-2">{new Date(sale.date).toLocaleTimeString()}</span>
                      <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${sale.paymentMethod === 'M-Pesa' ? 'bg-blue-900 text-blue-300' : 'bg-gray-600 text-gray-300'}`}>
                        {sale.paymentMethod || 'Cash'}
                      </span>
                    </div>
                    <span className="font-bold text-green-400">KES {formatMoney(sale.total)}</span>
                  </div>
                ))}
                {sales.length === 0 && <p className="text-gray-500 text-center">No transactions.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}