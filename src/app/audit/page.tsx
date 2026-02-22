 "use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/utils';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [plan, setPlan] = useState('Basic');

  useEffect(() => {
    const activePlan = localStorage.getItem('activePlan') || 'Basic';
    setPlan(activePlan);
    loadLogs();
  }, []);

  const loadLogs = () => {
    const data = JSON.parse(localStorage.getItem('system_logs') || '[]');
    setLogs(data);
  };

  const filteredLogs = filter === 'ALL' ? logs : logs.filter(l => l.category === filter);

  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'SALE': return 'bg-green-900 text-green-300';
      case 'INVENTORY': return 'bg-yellow-900 text-yellow-300';
      case 'ROOM': return 'bg-blue-900 text-blue-300';
      case 'SHIFT': return 'bg-purple-900 text-purple-300';
      case 'SECURITY': return 'bg-red-900 text-red-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  if (plan !== 'Pro') {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Pro Feature</h1>
        <p className="text-gray-400 mb-6">System Audit is available on Pro plans only.</p>
        <Link href="/pos" className="bg-blue-600 px-6 py-2 rounded">Back to Dashboard</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-red-500">System Audit Trail</h1>
            <p className="text-gray-400 text-sm">Immutable record of all system activities</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadLogs} className="bg-gray-700 px-3 py-1 rounded text-sm">Refresh</button>
            <Link href="/pos" className="bg-gray-600 px-4 py-2 rounded text-sm">Back</Link>
          </div>
        </header>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['ALL', 'SALE', 'INVENTORY', 'ROOM', 'SHIFT', 'SECURITY'].map(cat => (
            <button 
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap ${filter === cat ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Log Table */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-700 border-b border-gray-600">
                <tr>
                  <th className="p-3 w-40">Timestamp</th>
                  <th className="p-3 w-24">Category</th>
                  <th className="p-3 w-24">User</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="p-3 text-gray-400 text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getCategoryColor(log.category)}`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="p-3 text-orange-400 font-bold text-xs">{log.user}</td>
                    <td className="p-3 font-bold text-white">{log.action}</td>
                    <td className="p-3 text-gray-300 text-xs">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No activity logs found. Perform an action (like starting a shift or making a sale) to see logs.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}