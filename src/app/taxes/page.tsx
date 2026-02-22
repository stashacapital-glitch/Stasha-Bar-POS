 "use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/utils';

export default function TaxesPage() {
  const [settings, setSettings] = useState({ vatEnabled: false, vatRate: 16, serviceChargeEnabled: false, serviceChargeRate: 10 });
  const [plan, setPlan] = useState('Basic');

  useEffect(() => {
    const activePlan = localStorage.getItem('activePlan') || 'Basic';
    setPlan(activePlan);
    
    const savedSettings = localStorage.getItem('pos_tax_settings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  const handleSave = () => {
    localStorage.setItem('pos_tax_settings', JSON.stringify(settings));
    alert('Tax Settings Saved!');
  };

  if (plan === 'Basic') {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Feature Not Available</h1>
        <p className="text-gray-400 mb-6">Tax Configuration is not available on the Basic plan.</p>
        <Link href="/pos" className="bg-blue-600 px-6 py-2 rounded">Back to Tables</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-red-400">KRA Tax Config</h1>
          {/* UPDATED LINK */}
          <Link href="/pos" className="bg-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-500">Back to Tables</Link>
        </header>

        <div className="space-y-6 bg-gray-800 p-6 rounded-xl">
          <div className="flex justify-between items-center border-b border-gray-700 pb-4">
            <div>
              <h3 className="font-bold">Enable VAT</h3>
              <p className="text-xs text-gray-400">Standard 16% VAT</p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input type="checkbox" checked={settings.vatEnabled} onChange={(e) => setSettings({...settings, vatEnabled: e.target.checked})} className="sr-only" />
              <div className={`w-10 h-4 bg-gray-600 rounded-full shadow-inner transition-colors ${settings.vatEnabled ? 'bg-red-500' : ''}`}></div>
            </label>
          </div>

          <div>
            <label className="text-sm text-gray-400">VAT Rate (%)</label>
            <input type="number" value={settings.vatRate} onChange={(e) => setSettings({...settings, vatRate: Number(e.target.value)})} className="bg-gray-700 p-2 rounded w-full mt-1" />
          </div>

          <div className="flex justify-between items-center border-b border-gray-700 pb-4">
            <div>
              <h3 className="font-bold">Service Charge</h3>
              <p className="text-xs text-gray-400">Usually 10% for restaurants</p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input type="checkbox" checked={settings.serviceChargeEnabled} onChange={(e) => setSettings({...settings, serviceChargeEnabled: e.target.checked})} className="sr-only" />
              <div className={`w-10 h-4 bg-gray-600 rounded-full shadow-inner transition-colors ${settings.serviceChargeEnabled ? 'bg-blue-500' : ''}`}></div>
            </label>
          </div>

          <button onClick={handleSave} className="w-full bg-red-600 py-3 rounded font-bold mt-4">Save Settings</button>
        </div>
      </div>
    </main>
  );
}