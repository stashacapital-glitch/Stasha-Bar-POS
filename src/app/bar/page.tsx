 "use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

type OrderItem = { id: string; name: string; quantity: number; status: string; price: number; category: string };
type Order = { id: string; created_at: string; table_number: number; waiter_name: string; payment_status: string; items: OrderItem[]; payment_method?: string };

const formatMoney = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2 });

export default function BarmanDashboard() {
  const { user, role, signOut } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Print State
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [printType, setPrintType] = useState<'bill' | 'receipt'>('bill');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) router.push('/login');
    if (user) { fetchOrders(); const interval = setInterval(fetchOrders, 5000); return () => clearInterval(interval); }
  }, [user]);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, created_at, table_number, waiter_name, payment_status, payment_method, order_status, items:order_items(id, name, quantity, status, price, category)')
      .eq('status', 'active')
      .in('order_status', ['requested', 'processing'])
      .order('created_at', { ascending: true });
    
    if (data) setOrders(data);
    setLoading(false);
  };

  const handleDispense = async (orderId: string, itemId: string, itemName: string) => {
    const { data: menuItem } = await supabase.from('menu_items').select('stock_quantity').eq('name', itemName).single();
    if (!menuItem || menuItem.stock_quantity <= 0) return toast.error("Out of Stock!");

    await supabase.from('menu_items').update({ stock_quantity: menuItem.stock_quantity - 1 }).eq('name', itemName);
    await supabase.from('order_items').update({ status: 'dispensed' }).eq('id', itemId);
    
    toast.success("Dispensed!");
    fetchOrders();
  };

  // --- PAYMENT LOGIC (RESTORED) ---
  const handlePayment = async (orderId: string, method: 'cash' | 'mpesa') => {
    const orderToPrint = orders.find(o => o.id === orderId);
    if(!orderToPrint) return;

    // 1. HANDLE M-PESA
    if (method === 'mpesa') {
        const phone = prompt("Enter Customer M-Pesa Number (e.g., 254722...):");
        if (!phone) return; // User cancelled
        
        setProcessing(true);
        const toastId = toast.loading("Sending M-Pesa Request...");

        try {
            const res = await fetch('/api/mpesa', {
                method: 'POST',
                body: JSON.stringify({ 
                    phone, 
                    amount: calculateTotal(orderToPrint.items), 
                    orderId 
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await res.json();
            toast.dismiss(toastId);

            if (data.success) {
                toast.success("M-Pesa Request Sent! Check phone.");
                
                // Update DB
                await supabase.from('orders').update({ 
                    status: 'paid', 
                    payment_method: 'mpesa' 
                }).eq('id', orderId);

                // Print Receipt
                setPrintingOrder({ ...orderToPrint, payment_method: 'mpesa' });
                setPrintType('receipt');
                setTimeout(() => window.print(), 100);
                
                fetchOrders();
            } else {
                toast.error(data.message || "M-Pesa failed.");
            }
        } catch (e) {
            toast.dismiss(toastId);
            toast.error("Network Error");
        } finally {
            setProcessing(false);
        }
    } 
    
    // 2. HANDLE CASH
    else {
        // Update DB
        await supabase.from('orders').update({ 
            status: 'paid', 
            payment_method: 'cash' 
        }).eq('id', orderId);

        toast.success("Cash Accepted!");
        
        // Print Receipt
        setPrintingOrder({ ...orderToPrint, payment_method: 'cash' });
        setPrintType('receipt');
        setTimeout(() => window.print(), 100);
        
        fetchOrders();
    }
  };
  
  // --- BILL PRINT LOGIC ---
  const handlePrintBill = (order: Order) => {
    setPrintingOrder(order);
    setPrintType('bill');
    setTimeout(() => window.print(), 100);
  };

  // Clear print state after print
  useEffect(() => {
    const handleAfterPrint = () => setPrintingOrder(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const calculateTotal = (items: OrderItem[]) => items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  if (!user) return null;

  return (
    <>
      {/* --- MAIN DASHBOARD --- */}
      <div className="min-h-screen bg-gray-900 text-white p-4 print:hidden">
        <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-blue-400">🥃 Bar & Cashier</h1>
          <div className="flex gap-2">
            <button onClick={() => router.push('/kitchen')} className="bg-red-600 px-4 py-2 rounded font-bold text-sm">🍳 Kitchen</button>
            <button onClick={() => router.push('/admin')} className="bg-gray-700 px-4 py-2 rounded font-bold text-sm">Admin</button>
            <button onClick={signOut} className="bg-red-800 px-4 py-2 rounded font-bold text-sm">Logout</button>
          </div>
        </div>

        {loading ? <p className="text-center text-gray-400 mt-20">Loading...</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.length === 0 && <div className="col-span-full text-center text-gray-500 text-xl mt-20">Queue Empty</div>}
            
            {orders.map((order) => {
              const barItems = order.items.filter(i => i.category !== 'Food');
              const foodItems = order.items.filter(i => i.category === 'Food');
              const allItemsReady = order.items.every(i => i.status === 'dispensed' || i.status === 'ready');

              return (
                <div key={order.id} className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col">
                  <div className="bg-gray-700 p-3 rounded-t-xl flex justify-between items-center">
                    <div><h2 className="text-xl font-bold">Table {order.table_number}</h2><p className="text-xs text-yellow-400 font-bold">Waiter: {order.waiter_name}</p></div>
                    <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleTimeString()}</span>
                  </div>

                  <div className="p-4 flex-1 space-y-3">
                    {barItems.length > 0 && (
                      <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-3">
                        <h3 className="text-blue-400 font-bold mb-2 text-sm">🍺 BAR ITEMS</h3>
                        {barItems.map(item => (
                          <div key={item.id} className="flex justify-between items-center mb-2">
                            <span>{item.name} <span className="text-blue-300">x{item.quantity}</span></span>
                            {item.status !== 'dispensed' ? (
                              <button onClick={() => handleDispense(order.id, item.id, item.name)} className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-xs font-bold">DISPENSE</button>
                            ) : ( <span className="text-green-400 text-xs font-bold">✓ READY</span> )}
                          </div>
                        ))}
                      </div>
                    )}

                    {foodItems.length > 0 && (
                      <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-3">
                        <h3 className="text-orange-400 font-bold mb-2 text-sm">🍲 KITCHEN ITEMS</h3>
                        {foodItems.map(item => (
                          <div key={item.id} className="flex justify-between items-center mb-2 text-xs">
                            <span>{item.name} x{item.quantity}</span>
                            <span className={item.status === 'ready' ? 'text-green-400' : 'text-yellow-400'}>{item.status === 'ready' ? '✓ READY' : '⏳ COOKING'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-3 border-t border-gray-700 bg-gray-800 rounded-b-xl">
                     <div className="flex justify-between font-bold text-lg mb-2"><span>Total:</span><span>KES {formatMoney(calculateTotal(order.items))}</span></div>
                     
                     {/* Print Bill Button */}
                     <button onClick={() => handlePrintBill(order)} disabled={!allItemsReady} className={`w-full mb-2 p-2 rounded font-bold text-sm flex items-center justify-center gap-2 ${allItemsReady ? 'bg-gray-500 hover:bg-gray-400' : 'bg-gray-600 opacity-50'}`}>
                        🖨️ Print Bill
                     </button>

                     {/* Payment Buttons */}
                     <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => handlePayment(order.id, 'cash')} 
                            disabled={!allItemsReady || processing} 
                            className={`p-2 rounded text-xs font-bold flex items-center justify-center gap-1 ${allItemsReady ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-600 opacity-50'}`}>
                             💵 Cash
                          </button>
                          <button 
                            onClick={() => handlePayment(order.id, 'mpesa')} 
                            disabled={!allItemsReady || processing} 
                            className={`p-2 rounded text-xs font-bold flex items-center justify-center gap-1 ${allItemsReady ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 opacity-50'}`}>
                             📱 M-Pesa
                          </button>
                     </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- PROFESSIONAL PRINT LAYOUT --- */}
      <div className="hidden print:block bg-white text-black w-full" style={{ width: '80mm', margin: '0 auto', fontFamily: 'monospace' }}>
        {printingOrder && (
          <>
            {/* HEADER */}
            <div className="text-center border-b border-dashed border-black pb-2 mb-2">
              <h1 className="text-xl font-bold tracking-wider">THE DEV BAR</h1>
              <p className="text-xs">P.O. Box 12345, Nairobi</p>
              <p className="text-xs">Tel: 0700 000 000</p>
            </div>

            {/* DOCUMENT TYPE */}
            <div className={`text-center font-bold text-lg mb-2 py-1 ${printType === 'receipt' ? 'bg-gray-100 border border-black' : ''}`}>
                {printType === 'bill' ? '--- PRO-FORMA BILL ---' : '--- OFFICIAL RECEIPT ---'}
            </div>

            {/* META INFO */}
            <div className="flex justify-between text-xs mb-2">
                <span>Table: <b>{printingOrder.table_number}</b></span>
                <span>Waiter: <b>{printingOrder.waiter_name}</b></span>
            </div>
            <div className="flex justify-between text-xs mb-2 border-b border-dashed border-black pb-2">
                <span>Date: {new Date(printingOrder.created_at).toLocaleDateString()}</span>
                <span>Time: {new Date(printingOrder.created_at).toLocaleTimeString()}</span>
            </div>

            {/* ITEMS TABLE */}
            <table className="w-full text-xs mb-2">
                <thead>
                    <tr className="font-bold border-b border-black">
                        <th className="text-left py-1 w-1/2">Item</th>
                        <th className="text-center py-1 w-1/6">Qty</th>
                        <th className="text-right py-1 w-1/6">Price</th>
                        <th className="text-right py-1 w-1/6">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {printingOrder.items.map(item => (
                        <tr key={item.id} className="border-b border-dotted border-gray-300">
                            <td className="py-1">{item.name}</td>
                            <td className="text-center py-1">{item.quantity}</td>
                            <td className="text-right py-1">{formatMoney(item.price)}</td>
                            <td className="text-right py-1 font-bold">{formatMoney(item.price * item.quantity)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* TOTALS */}
            <div className="border-t-2 border-black pt-2 mt-2">
                <div className="flex justify-between font-bold text-base">
                    <span>TOTAL</span>
                    <span>KES {formatMoney(calculateTotal(printingOrder.items))}</span>
                </div>
            </div>

            {/* PAYMENT INFO (RECEIPT ONLY) */}
            {printType === 'receipt' && (
                <div className="mt-4 border-t border-black pt-2 text-center">
                    <p className="text-sm font-bold">** PAID **</p>
                    <p className="text-xs">Method: <b>{printingOrder.payment_method?.toUpperCase()}</b></p>
                </div>
            )}

            {/* FOOTER */}
            <div className="mt-4 pt-2 border-t border-dashed border-black text-center text-[10px] text-gray-600">
                <p>Thank you for your business!</p>
                <p>Powered by Stasha POS</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}