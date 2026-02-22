 "use client";
import { useState, useEffect } from 'react';
import { formatMoney } from '@/lib/utils';

interface TransferModalProps {
  currentTableId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferModal({ currentTableId, onClose, onSuccess }: TransferModalProps) {
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState('');

  useEffect(() => {
    const savedTables = localStorage.getItem('pos_tables_data');
    if (savedTables) {
      const allTables = JSON.parse(savedTables);
      setTables(allTables.filter((t: any) => t.id !== currentTableId));
    }
  }, [currentTableId]);

  const handleTransfer = () => {
    if (!selectedTable) return alert("Select a target table");

    const savedTables = localStorage.getItem('pos_tables_data');
    if (!savedTables) return;
    let allTables = JSON.parse(savedTables);

    const sourceIdx = allTables.findIndex((t: any) => t.id === currentTableId);
    const targetIdx = allTables.findIndex((t: any) => t.id === Number(selectedTable));

    if (sourceIdx === -1 || targetIdx === -1) return alert("Table not found");

    const sourceTable = allTables[sourceIdx];
    const targetTable = allTables[targetIdx];

    const newOrder = [...targetTable.order || [], ...sourceTable.order || []];
    const newTotal = newOrder.reduce((sum: number, i: any) => sum + (i.price * i.qty), 0);

    allTables[targetIdx] = {
      ...targetTable,
      order: newOrder,
      total: newTotal,
      status: 'occupied',
      waiter: sourceTable.waiter
    };

    allTables[sourceIdx] = {
      ...sourceTable,
      order: [],
      total: 0,
      status: 'open',
      waiter: ''
    };

    localStorage.setItem('pos_tables_data', JSON.stringify(allTables));
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-xl w-full max-w-sm border border-gray-600">
        <h2 className="text-xl font-bold mb-4 text-blue-400">Transfer Table {currentTableId}</h2>
        
        <label className="text-xs text-gray-400">Move order to:</label>
        <select 
          value={selectedTable} 
          onChange={(e) => setSelectedTable(e.target.value)}
          className="w-full bg-gray-700 p-3 rounded mt-1 mb-6"
        >
          <option value="">Select Table</option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              Table {t.id} ({t.status === 'open' ? 'Empty' : `KES ${formatMoney(t.total)}`})
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button onClick={onClose} className="w-full bg-gray-600 py-2 rounded font-bold">Cancel</button>
          <button onClick={handleTransfer} className="w-full bg-blue-600 py-2 rounded font-bold">Transfer</button>
        </div>
      </div>
    </div>
  );
}