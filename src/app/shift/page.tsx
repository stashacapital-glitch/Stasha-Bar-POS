"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/utils';
import { logActivity } from '@/lib/logger'; // NEW

export default function ShiftPage() {
  const [plan, setPlan] = useState('Basic');
  const [activeShift, setActiveShift] = useState<any>(null);
  const [staffName, setStaffName] = useState('');
  
  const [showStartModal, setShowStartModal] = useState(false);
  const [startCash, setStartCash] = useState(0);

  const [showEndModal, setShowEndModal] = useState(false);
  const [endCash, setEndCash] = useState(0);

  useEffect(() => {
    const activePlan = localStorage.getItem('activePlan') || 'Basic';
    setPlan(activePlan);
    
    const staff = localStorage.getItem('current_staff') || 'Waiter 1';
    setStaffName(staff);
    loadActiveShift();
  }, []);

  const loadActiveShift = () => {
    const saved = localStorage.getItem('active_shift');
    if (saved) setActiveShift(JSON.parse(saved));
    else setActiveShift(null);
  };

  const handleStartShift = () => {
    const shift = {
      id: Date.now(), staff: staffName, startTime: new Date().toISOString(), startCash: startCash, status: 'open'
    };
    localStorage.setItem('active_shift', JSON.stringify(shift));
    
    // NEW: Audit Log
    logActivity('SHIFT', 'SHIFT_START', `${staffName} started shift with float KES ${formatMoney(startCash)}`, { float: startCash });

    setActiveShift(shift);
    setShowStartModal(false);
    alert('Shift Started!');
  };

  const handleEndShift = () => {
    if (!activeShift) return;

    const history = JSON.parse(localStorage.getItem('sales_history') || '[]');
    const shiftSales = history.filter((s: any) => {
      const saleDate = new Date(s.date); const startDate = new Date(activeShift.startTime);
      return saleDate >= startDate && s.waiter === activeShift.staff;
    });

    const cashSales = shiftSales.filter((s: any) => s.paymentMethod === 'Cash').reduce((sum: number, s: any) => sum + s.total, 0);
    const mpesaSales = shiftSales.filter((s: any) => s.paymentMethod === 'M-Pesa').reduce((sum: number, s: any) => sum + s.total, 0);
    const roomPosts = shiftSales.filter((s: any) => s.paymentMethod === 'Room Charge').reduce((sum: number, s: any) => sum + s.total, 0);
    const expectedCash = activeShift.startCash + cashSales;
    const variance = endCash - expectedCash;

    const report = { ...activeShift, endTime: new Date().toISOString(), endCash, expectedCash, cashSales, mpesaSales, roomPosts, variance, status: 'closed' };
    const shiftHistory = JSON.parse(localStorage.getItem('shift_history') || '[]');
    shiftHistory.push(report);
    localStorage.setItem('shift_history', JSON.stringify(shiftHistory));

    // NEW: Audit Log
    logActivity('SHIFT', 'SHIFT_END', `${activeShift.staff} ended shift. Cash: ${formatMoney(cashSales)}. Variance: ${formatMoney(variance)}`, { cashSales, variance });

    localStorage.removeItem('active_shift');
    setActiveShift(null);
    setShowEndModal(false);
    alert(`Shift Closed!\nCash Sales: ${formatMoney(cashSales)}\nExpected: ${formatMoney(expectedCash)}\nActual: ${formatMoney(endCash)}\nVariance: ${formatMoney(variance)}`);
  };

  if (plan === 'Basic') {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Pro Feature</h1>
        <p className="text-gray-400 mb-6">Shift Management is not available on the Basic plan.</p>
        <Link href="/pos" className="bg-blue-600 px-6 py-2 rounded">Back to Dashboard</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      
      {showStartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-sm border border-gray-600">
            <h2 className="text-xl font-bold mb-4 text-green-400">Start Shift</h2>
            <p className="text-sm text-gray-400 mb-2">Staff: {staffName}</p>
            <label className="text-xs text-gray-400">Starting Cash Float (KES)</label>
            <input type="number" placeholder="e.g. 5000" value={startCash} onChange={(e) => setStartCash(Number(e.target.value))} className="w-full bg-gray-700 p-3 rounded mt-1 mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowStartModal(false)} className="w-full bg-gray-600 py-2 rounded">Cancel</button>
              <button onClick={handleStartShift} className="w-full bg-green-600 py-2 rounded font-bold">Start</button>
            </div>
          </div>
        </div>
      )}

      {showEndModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-sm border border-gray-600">
            <h2 className="text-xl font-bold mb-4 text-red-400">End Shift</h2>
            <p className="text-sm text-gray-300 mb-4">Count the cash currently in the drawer.</p>
            <label className="text-xs text-gray-400">Actual Cash Counted (KES)</label>
            <input type="number" placeholder="Total in drawer" value={endCash} onChange={(e) => setEndCash(Number(e.target.value))} className="w-full bg-gray-700 p-3 rounded mt-1 mb-4 text-lg font-bold" />
            <div className="flex gap-2">
              <button onClick={() => setShowEndModal(false)} className="w-full bg-gray-600 py-2 rounded">Cancel</button>
              <button onClick={handleEndShift} className="w-full bg-red-600 py-2 rounded font-bold">Close Shift</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-blue-400">Shift Management</h1>
          <Link href="/pos" className="bg-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-500">Back</Link>
        </header>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center">
          {activeShift ? (
            <div>
              <div className="inline-block px-4 py-1 rounded-full bg-green-600 text-white text-xs font-bold mb-4 animate-pulse">SHIFT IN PROGRESS</div>
              <p className="text-lg font-bold mb-2">{activeShift.staff}</p>
              <p className="text-gray-400 text-sm mb-4">Started: {new Date(activeShift.startTime).toLocaleString()}</p>
              <div className="bg-gray-700 p-4 rounded-lg inline-block mb-6">
                <p className="text-xs text-gray-400">Starting Float</p>
                <p className="text-2xl font-bold text-white">KES {formatMoney(activeShift.startCash)}</p>
              </div>
              <div className="space-y-2">
                <Link href="/reports" className="block w-full bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold">View Live Sales</Link>
                <button onClick={() => setShowEndModal(true)} className="w-full bg-red-600 hover:bg-red-500 py-3 rounded font-bold">End Shift</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-6xl mb-4">⏱️</div>
              <h2 className="text-xl font-bold mb-2">No Active Shift</h2>
              <p className="text-gray-400 mb-6">You must start a shift to record sales data accurately.</p>
              <button onClick={() => setShowStartModal(true)} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded font-bold">Start Shift</button>
            </div>
          )}
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4 text-gray-400">Recent Shifts</h3>
          <div className="space-y-2">
            {JSON.parse(localStorage.getItem('shift_history') || '[]').slice(-5).reverse().map((s: any, i: number) => (
              <div key={i} className="bg-gray-800 p-3 rounded border border-gray-700 text-xs flex justify-between">
                <div>
                  <span className="font-bold text-white">{s.staff}</span>
                  <span className="text-gray-400 ml-2">{new Date(s.startTime).toLocaleDateString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-green-400 mr-2">Cash: {formatMoney(s.cashSales)}</span>
                  <span className={`${s.variance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>Var: {formatMoney(s.variance)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}