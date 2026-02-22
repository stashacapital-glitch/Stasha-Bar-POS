 "use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/utils';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [plan, setPlan] = useState('Basic');

  useEffect(() => {
    const activePlan = localStorage.getItem('activePlan') || 'Basic';
    setPlan(activePlan);
    
    const savedInventory = localStorage.getItem('inventory_data');
    if (savedInventory) setInventory(JSON.parse(savedInventory));
    else {
        const defaultInv = [
            { id: 1, name: 'Tusker Lager', opening: 24, purchases: 0, sales: 0, actual: 24, price: 300, category: 'Bar' },
        ];
        setInventory(defaultInv);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('inventory_data', JSON.stringify(inventory));
    alert('Inventory Saved!');
  };

  const addItem = () => {
    setInventory([...inventory, { id: Date.now(), name: 'New Item', opening: 0, purchases: 0, sales: 0, actual: 0, price: 0, category: 'General' }]);
  };

  const updateItem = (id: number, field: string, value: any) => {
    setInventory(inventory.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  if (plan === 'Basic') {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Feature Not Available</h1>
        <p className="text-gray-400 mb-6">Inventory Management is not available on the Basic plan.</p>
        <Link href="/pos" className="bg-blue-600 px-6 py-2 rounded">Back to Tables</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-yellow-400">Inventory</h1>
          {/* UPDATED LINK */}
          <Link href="/pos" className="bg-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-500">Back to Tables</Link>
        </header>

        <div className="overflow-x-auto bg-gray-800 rounded-xl p-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-600 text-gray-400">
                <th className="p-2">Item</th>
                <th className="p-2 w-20">Op.</th>
                <th className="p-2 w-20">+ Purch.</th>
                <th className="p-2 w-20">- Sales</th>
                <th className="p-2 w-20">= Exp.</th>
                <th className="p-2 w-20">Actual</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id} className="border-b border-gray-700">
                  <td className="p-2 font-bold">{item.name}</td>
                  <td className="p-2"><input type="number" value={item.opening} onChange={(e) => updateItem(item.id, 'opening', Number(e.target.value))} className="bg-gray-700 w-full p-1 rounded" /></td>
                  <td className="p-2"><input type="number" value={item.purchases} onChange={(e) => updateItem(item.id, 'purchases', Number(e.target.value))} className="bg-gray-700 w-full p-1 rounded" /></td>
                  <td className="p-2 text-red-400 text-center">{item.sales || 0}</td>
                  <td className="p-2 text-center text-green-400">{(item.opening || 0) + (item.purchases || 0) - (item.sales || 0)}</td>
                  <td className="p-2"><input type="number" value={item.actual} onChange={(e) => updateItem(item.id, 'actual', Number(e.target.value))} className="bg-gray-700 w-full p-1 rounded" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-4 mt-6">
          <button onClick={addItem} className="w-full bg-gray-700 py-3 rounded font-bold">+ Add Item</button>
          <button onClick={handleSave} className="w-full bg-yellow-500 py-3 rounded font-bold text-black">Save Inventory</button>
        </div>
      </div>
    </main>
  );
}