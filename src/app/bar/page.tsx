 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import Receipt from '@/components/Receipt';

export default function BarPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tables')
      .select('*, orders(*)');

    if (error) {
      console.error('Error fetching tables:', error);
    } else {
      setTables(data || []);
    }
    setLoading(false);
  };

  const calculateReceiptData = (orderItems: any[]) => {
    if (!orderItems || orderItems.length === 0) {
      return { subTotal: 0, discount: 0, vat: 0, service: 0, total: 0 };
    }

    const subTotal = orderItems.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity);
    }, 0);

    const discount = 0; 
    const vatRate = 0.16; 
    const serviceRate = 0.10; 

    const vat = subTotal * vatRate;
    const service = subTotal * serviceRate;
    const total = subTotal - discount + vat + service;

    return { subTotal, discount, vat, service, total };
  };

  if (loading) return <div className="p-8 text-white">Loading Bar View...</div>;

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl font-bold text-orange-400 mb-6">Bar View</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((table) => {
          const orderItems = table.orders || [];
          const receiptData = calculateReceiptData(orderItems);
          
          // FIX: Generate a date string for the receipt
          const currentDate = new Date().toLocaleString();

          return (
            <div key={table.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold">Table {table.number || table.id}</h2>
                <span className="text-sm px-2 py-1 bg-green-600 rounded text-xs">
                  {orderItems.length > 0 ? 'OCCUPIED' : 'EMPTY'}
                </span>
              </div>
              
              <div className="text-sm text-gray-400 mb-4">
                Items: {orderItems.length}
              </div>

              {/* Hidden Receipt for printing */}
              <div className="hidden print:block">
                <Receipt 
                  items={orderItems} 
                  tableId={table.id}
                  subTotal={receiptData.subTotal}
                  discount={receiptData.discount}
                  vat={receiptData.vat}
                  service={receiptData.service}
                  total={receiptData.total}
                  date={currentDate} // FIX: Added date prop
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}