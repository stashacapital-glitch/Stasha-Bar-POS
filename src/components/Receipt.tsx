 "use client";
import { useState, useEffect } from 'react';
import { formatMoney } from '@/lib/utils';

interface ReceiptProps {
  tableId: number;
  items: any[];
  subTotal: number;
  discount: number;
  vat: number;
  service: number;
  total: number;
  date: string;
}

export default function Receipt({ tableId, items, subTotal, discount, vat, service, total, date }: ReceiptProps) {
  const [profile, setProfile] = useState({ name: 'The Dev Bar', address: '', phone: '', taxId: '' });

  useEffect(() => {
    const savedProfile = localStorage.getItem('business_profile');
    if (savedProfile) setProfile(JSON.parse(savedProfile));
  }, []);

  return (
    <div id="receipt-area" className="bg-white text-black p-4 font-mono text-xs w-72 mx-auto shadow-md">
      
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold uppercase tracking-wide">{profile.name}</h1>
        {profile.address && <p className="text-[10px] text-gray-600 mt-1">{profile.address}</p>}
        {profile.phone && <p className="text-[10px] text-gray-600">{profile.phone}</p>}
        {profile.taxId && <p className="text-[10px] font-bold mt-2">PIN: {profile.taxId}</p>}
      </div>

      {/* Meta Data */}
      <div className="border-t border-b border-dashed border-gray-300 py-2 mb-3 text-[11px] flex justify-between">
        <div>
          <p>Date: {date}</p>
          <p>Table: {tableId}</p>
        </div>
        <div className="text-right">
          <p>Staff: {typeof window !== 'undefined' ? localStorage.getItem('current_staff') || 'Admin' : 'Admin'}</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-[11px] mb-3">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-1 font-normal text-gray-500">Item</th>
            <th className="text-center py-1 font-normal text-gray-500 w-12">Qty</th>
            <th className="text-right py-1 font-normal text-gray-500">Price</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-50">
              <td className="py-1.5">{item.name}</td>
              <td className="text-center py-1.5">{item.qty}</td>
              <td className="text-right py-1.5">{formatMoney(item.price * item.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="border-t border-gray-200 pt-2 text-[11px] space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span>{formatMoney(subTotal)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>- {formatMoney(discount)}</span>
          </div>
        )}

        {vat > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">VAT (16%)</span>
            <span>{formatMoney(vat)}</span>
          </div>
        )}

        {service > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Service Chrg</span>
            <span>{formatMoney(service)}</span>
          </div>
        )}

        <div className="flex justify-between font-bold text-sm border-t border-gray-300 mt-2 pt-2">
          <span>TOTAL</span>
          <span>KES {formatMoney(total)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-6 text-[10px] text-gray-500">
        <p>Thank you for your business!</p>
        <p className="mt-1">Powered by StashaPOS</p>
      </div>
    </div>
  );
}