"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PayrollPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [plan, setPlan] = useState('Basic');

  useEffect(() => {
    const activePlan = localStorage.getItem('activePlan') || 'Basic';
    setPlan(activePlan);
    
    const savedStaff = localStorage.getItem('staff_data');
    if (savedStaff) setStaff(JSON.parse(savedStaff));
    else {
        const defaultStaff = [
            { id: 1, name: 'Waiter 1', role: 'Waiter', salary: 15000, tips: 0 },
            { id: 2, name: 'Chef 1', role: 'Kitchen', salary: 20000, tips: 0 },
        ];
        setStaff(defaultStaff);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('staff_data', JSON.stringify(staff));
    alert('Payroll Saved!');
  };

  const addStaff = () => {
    setStaff([...staff, { id: Date.now(), name: 'New Staff', role: 'Waiter', salary: 0, tips: 0 }]);
  };

  const updateStaff = (id: number, field: string, value: any) => {
    setStaff(staff.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  if (plan === 'Basic') {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Feature Not Available</h1>
        <p className="text-gray-400 mb-6">Payroll is not available on the Basic plan.</p>
        <Link href="/pos" className="bg-blue-600 px-6 py-2 rounded">Back to Tables</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-green-400">Payroll Management</h1>
          {/* UPDATED LINK */}
          <Link href="/pos" className="bg-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-500">Back to Tables</Link>
        </header>

        <div className="space-y-4">
          {staff.map((s) => (
            <div key={s.id} className="grid grid-cols-4 gap-2 bg-gray-800 p-3 rounded items-center">
              <input type="text" value={s.name} onChange={(e) => updateStaff(s.id, 'name', e.target.value)} className="bg-gray-700 p-2 rounded" />
              <select value={s.role} onChange={(e) => updateStaff(s.id, 'role', e.target.value)} className="bg-gray-700 p-2 rounded">
                <option>Waiter</option><option>Kitchen</option><option>Manager</option>
              </select>
              <input type="number" value={s.salary} onChange={(e) => updateStaff(s.id, 'salary', Number(e.target.value))} className="bg-gray-700 p-2 rounded" placeholder="Salary" />
              <div className="text-right text-sm text-gray-400">
                Tips: KES {s.tips || 0}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 mt-6">
          <button onClick={addStaff} className="w-full bg-gray-700 py-3 rounded font-bold">+ Add Staff</button>
          <button onClick={handleSave} className="w-full bg-green-600 py-3 rounded font-bold">Save Payroll</button>
        </div>
      </div>
    </main>
  );
}