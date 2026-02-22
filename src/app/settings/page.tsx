 "use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [plan, setPlan] = useState('Basic');
  const [newPin, setNewPin] = useState('');
  
  // NEW: Business Profile State
  const [business, setBusiness] = useState({ name: '', address: '', phone: '', taxId: '' });

  useEffect(() => {
    const activePlan = localStorage.getItem('activePlan') || 'Basic';
    setPlan(activePlan);

    // Load Business Profile
    const savedProfile = localStorage.getItem('business_profile');
    if (savedProfile) setBusiness(JSON.parse(savedProfile));
  }, []);

  const logout = () => {
    localStorage.removeItem('activePlan');
    window.location.href = "/";
  };

  // --- Handlers ---

  const handleSetPin = () => {
    if (newPin.length < 4) return alert("PIN must be at least 4 digits");
    localStorage.setItem('manager_pin', newPin);
    setNewPin('');
    alert('Manager PIN updated successfully!');
  };

  const handleSaveProfile = () => {
    localStorage.setItem('business_profile', JSON.stringify(business));
    alert('Business Profile Saved!');
  };

  const handleDownload = () => {
    const data = {
      plan: localStorage.getItem('activePlan'),
      menu: JSON.parse(localStorage.getItem('pos_menu_data') || '[]'),
      inventory: JSON.parse(localStorage.getItem('inventory_data') || '[]'),
      tables: JSON.parse(localStorage.getItem('pos_tables_data') || '[]'),
      taxes: JSON.parse(localStorage.getItem('pos_tax_settings') || '{}'),
      profile: JSON.parse(localStorage.getItem('business_profile') || '{}'), // Include profile
      staff: JSON.parse(localStorage.getItem('staff_data') || '[]'),
      history: JSON.parse(localStorage.getItem('sales_history') || '[]'),
      room_assignments: JSON.parse(localStorage.getItem('room_assignments') || '{}'),
      expenses: JSON.parse(localStorage.getItem('business_expenses') || '[]'),
      system_logs: JSON.parse(localStorage.getItem('system_logs') || '[]'),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pos-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        
        if (data.plan) localStorage.setItem('activePlan', data.plan);
        if (data.menu) localStorage.setItem('pos_menu_data', JSON.stringify(data.menu));
        if (data.inventory) localStorage.setItem('inventory_data', JSON.stringify(data.inventory));
        if (data.tables) localStorage.setItem('pos_tables_data', JSON.stringify(data.tables));
        if (data.taxes) localStorage.setItem('pos_tax_settings', JSON.stringify(data.taxes));
        if (data.profile) localStorage.setItem('business_profile', JSON.stringify(data.profile));
        if (data.staff) localStorage.setItem('staff_data', JSON.stringify(data.staff));
        if (data.history) localStorage.setItem('sales_history', JSON.stringify(data.history));
        if (data.room_assignments) localStorage.setItem('room_assignments', JSON.stringify(data.room_assignments));
        if (data.expenses) localStorage.setItem('business_expenses', JSON.stringify(data.expenses));
        if (data.system_logs) localStorage.setItem('system_logs', JSON.stringify(data.system_logs));

        alert('Data restored successfully! Reloading...');
        window.location.reload();
      } catch (err) {
        alert('Failed to read backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-gray-300">Settings</h1>
          <Link href="/pos" className="bg-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-500">Back to Tables</Link>
        </header>

        <div className="space-y-6">

          {/* Business Profile Section */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-bold mb-4">Business Profile</h2>
            <p className="text-xs text-gray-400 mb-4">This information will appear on your receipts.</p>
            
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Business Name (e.g. The Dev Bar)" 
                value={business.name} 
                onChange={(e) => setBusiness({...business, name: e.target.value})} 
                className="w-full bg-gray-700 p-2 rounded border border-gray-600" 
              />
              <input 
                type="text" 
                placeholder="Address (e.g. 123 Main St, Nairobi)" 
                value={business.address} 
                onChange={(e) => setBusiness({...business, address: e.target.value})} 
                className="w-full bg-gray-700 p-2 rounded border border-gray-600" 
              />
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="Phone Number" 
                  value={business.phone} 
                  onChange={(e) => setBusiness({...business, phone: e.target.value})} 
                  className="w-full bg-gray-700 p-2 rounded border border-gray-600" 
                />
                <input 
                  type="text" 
                  placeholder="PIN / Tax ID" 
                  value={business.taxId} 
                  onChange={(e) => setBusiness({...business, taxId: e.target.value})} 
                  className="w-full bg-gray-700 p-2 rounded border border-gray-600" 
                />
              </div>
              <button onClick={handleSaveProfile} className="w-full bg-teal-600 hover:bg-teal-500 py-2 rounded font-bold mt-2">
                Save Profile
              </button>
            </div>
          </div>

          {/* Plan Info */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-bold mb-2">Current Plan</h2>
            <p className="text-2xl text-orange-400 font-bold">{plan}</p>
            <button onClick={logout} className="mt-4 bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm">Exit Plan / Switch User</button>
          </div>

          {/* Security Section */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-bold mb-2">Security</h2>
            <p className="text-xs text-gray-400 mb-4">Set a PIN to protect sensitive actions (Voiding, Discounts).</p>
            
            <div className="flex gap-2">
              <input 
                type="password" 
                placeholder="Enter new PIN" 
                value={newPin} 
                onChange={(e) => setNewPin(e.target.value)}
                className="flex-1 bg-gray-700 p-2 rounded border border-gray-600"
              />
              <button 
                onClick={handleSetPin} 
                className="bg-green-600 px-4 py-2 rounded font-bold"
              >
                Set PIN
              </button>
            </div>
          </div>

          {/* Backup & Restore Section */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-bold mb-2">Data Backup</h2>
            <p className="text-xs text-gray-400 mb-4">Download your data to prevent loss. Restore it later if needed.</p>
            
            <div className="flex flex-col md:flex-row gap-4">
              <button onClick={handleDownload} className="flex-1 bg-blue-600 hover:bg-blue-500 px-4 py-3 rounded font-bold text-center">
                ⬇️ Download Backup
              </button>
              
              <div className="flex-1">
                <label className="block w-full bg-green-600 hover:bg-green-500 px-4 py-3 rounded font-bold text-center cursor-pointer">
                  ⬆️ Restore Backup
                  <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                </label>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}