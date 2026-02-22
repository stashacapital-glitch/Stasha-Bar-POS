 "use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function MenuPage() {
  const [menu, setMenu] = useState<any[]>([]);
  const [plan, setPlan] = useState('Basic');

  useEffect(() => {
    const activePlan = localStorage.getItem('activePlan') || 'Basic';
    setPlan(activePlan);
    
    const savedMenu = localStorage.getItem('pos_menu_data');
    if (savedMenu) setMenu(JSON.parse(savedMenu));
    else {
        // Default menu if empty
        const defaultMenu = [
            { id: 1, name: 'Tusker Lager', price: 300, type: 'bar' },
            { id: 2, name: 'Nyama Choma', price: 1200, type: 'kitchen' },
        ];
        setMenu(defaultMenu);
        localStorage.setItem('pos_menu_data', JSON.stringify(defaultMenu));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('pos_menu_data', JSON.stringify(menu));
    alert('Menu Saved!');
  };

  const addItem = () => {
    setMenu([...menu, { id: Date.now(), name: 'New Item', price: 0, type: 'bar' }]);
  };

  const updateItem = (id: number, field: string, value: any) => {
    setMenu(menu.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const deleteItem = (id: number) => {
    setMenu(menu.filter(item => item.id !== id));
  };

  if (plan === 'Basic') {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Feature Not Available</h1>
        <p className="text-gray-400 mb-6">Menu Management is not available on the Basic plan.</p>
        <Link href="/pos" className="bg-blue-600 px-6 py-2 rounded">Back to Tables</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-pink-400">Menu Manager</h1>
          {/* UPDATED LINK */}
          <Link href="/pos" className="bg-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-500">Back to Tables</Link>
        </header>

        <div className="space-y-4 mb-8">
          {menu.map((item) => (
            <div key={item.id} className="grid grid-cols-4 gap-2 bg-gray-800 p-3 rounded items-center">
              <input type="text" value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} className="bg-gray-700 p-2 rounded col-span-2" />
              <input type="number" value={item.price} onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))} className="bg-gray-700 p-2 rounded" />
              <div className="flex gap-2">
                <select value={item.type} onChange={(e) => updateItem(item.id, 'type', e.target.value)} className="bg-gray-700 p-2 rounded flex-1">
                  <option value="bar">Bar</option>
                  <option value="kitchen">Kitchen</option>
                </select>
                <button onClick={() => deleteItem(item.id)} className="bg-red-600 px-2 rounded text-xs">X</button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button onClick={addItem} className="w-full bg-gray-700 py-3 rounded font-bold">+ Add Item</button>
          <button onClick={handleSave} className="w-full bg-pink-600 py-3 rounded font-bold text-white">Save Menu</button>
        </div>
      </div>
    </main>
  );
}