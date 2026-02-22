 "use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Receipt from '@/components/Receipt';
import { formatMoney } from '@/lib/utils';
import { saveRecord } from '@/lib/offline';
import { supabase } from '@/utils/supabase';
import { logActivity } from '@/lib/logger';
import PinModal from '@/components/PinModal';
import TransferModal from '@/components/TransferModal';

export default function TableOrderPage() {
  const params = useParams();
  const router = useRouter();
  const tableId = Number(params.id);
  
  // Core State
  const [order, setOrder] = useState<any[]>([]);
  const [plan, setPlan] = useState('Basic');
  const [tableData, setTableData] = useState({ status: 'open', total: 0, waiter: '' });
  const [canPrint, setCanPrint] = useState(true);
  const [menu, setMenu] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [taxSettings, setTaxSettings] = useState({ vatEnabled: false, vatRate: 16, serviceChargeEnabled: false, serviceChargeRate: 10 });

  // Modals State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [tipAmount, setTipAmount] = useState(0);
  
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountType, setDiscountType] = useState('fixed');
  const [discountValue, setDiscountValue] = useState(0);

  const [customers, setCustomers] = useState<any[]>([]);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [roomAssignments, setRoomAssignments] = useState<{ [key: number]: any }>({});
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');

  // Security & Modals
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'void' | 'discount' | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitAmount, setSplitAmount] = useState(0);
  
  // FIX: Initialize paidAmount safely in state
  const [paidAmount, setPaidAmount] = useState(0);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const activePlan = localStorage.getItem('activePlan') || 'Basic';
    setPlan(activePlan);
    setCanPrint(activePlan !== 'Basic');

    const savedMenu = localStorage.getItem('pos_menu_data');
    if (savedMenu) setMenu(JSON.parse(savedMenu));
    else setMenu([
      { name: 'Tusker Lager', price: 300, type: 'bar' }, { name: 'Whiskey', price: 600, type: 'bar' },
      { name: 'Cocktail', price: 850, type: 'bar' }, { name: 'Soda', price: 100, type: 'bar' },
      { name: 'Nyama Choma', price: 1200, type: 'kitchen' }, { name: 'Fries', price: 400, type: 'kitchen' },
    ]);

    const savedInventory = localStorage.getItem('inventory_data');
    if (savedInventory) {
      const inv = JSON.parse(savedInventory);
      setInventory(inv);
      setAvailableRooms(inv.filter((i: any) => i.category === 'Rooms'));
    }

    const savedTaxSettings = localStorage.getItem('pos_tax_settings');
    if (savedTaxSettings) setTaxSettings(JSON.parse(savedTaxSettings));

    const savedTables = localStorage.getItem('pos_tables_data');
    if (savedTables) {
      const tables = JSON.parse(savedTables);
      const current = tables.find((t: any) => t.id === tableId);
      if (current) {
        setTableData({ status: current.status || 'open', total: current.total || 0, waiter: current.waiter || '' });
        if (current.order) setOrder(current.order);
        // FIX: Set paidAmount inside useEffect
        setPaidAmount(current.paid || 0);
      }
    }

    supabase.from('customers').select('id, name').then(({ data }) => {
      if (data) setCustomers(data);
    });

    const savedAssignments = localStorage.getItem('room_assignments');
    if (savedAssignments) setRoomAssignments(JSON.parse(savedAssignments));

  }, [tableId]);

  // --- Core Logic ---

  const getStockLevel = (itemName: string) => {
    const item = inventory.find((i) => i.name === itemName);
    if (!item) return null;
    const expectedStock = (item.opening || 0) + (item.purchases || 0) - (item.sales || 0);
    const inCart = order.find((o) => o.name === itemName)?.qty || 0;
    return expectedStock - inCart;
  };

  const saveTable = (newOrder: any[], newStatus: string) => {
    const total = newOrder.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const savedTables = localStorage.getItem('pos_tables_data');
    let tables = savedTables ? JSON.parse(savedTables) : [];
    const staff = localStorage.getItem('current_staff') || 'Staff';
    const updatedTables = tables.map((t: any) => t.id === tableId ? { ...t, status: newStatus, total: total, order: newOrder, waiter: staff } : t);
    localStorage.setItem('pos_tables_data', JSON.stringify(updatedTables));
    setOrder(newOrder);
    setTableData({ status: newStatus, total: total, waiter: staff });
  };

  const addToOrder = (item: any) => {
    const stock = getStockLevel(item.name);
    if (stock !== null && stock <= 0) return alert(`Insufficient stock for ${item.name}.`);
    
    const existing = order.find(o => o.name === item.name);
    let newOrder;
    if (existing) newOrder = order.map(o => o.name === item.name ? { ...o, qty: o.qty + 1 } : o);
    else newOrder = [...order, { ...item, qty: 1 }];
    saveTable(newOrder, 'occupied');

    if (item.type === 'kitchen') {
      setAlertMessage('⚠️ FOOD ITEM ADDED! Please notify Kitchen.');
      setTimeout(() => setAlertMessage(''), 3000);
    }
  };

  const decreaseQty = (itemName: string) => {
    const existing = order.find(o => o.name === itemName);
    if (!existing) return;
    let newOrder;
    if (existing.qty === 1) newOrder = order.filter(o => o.name !== itemName);
    else newOrder = order.map(o => o.name === itemName ? { ...o, qty: o.qty - 1 } : o);
    saveTable(newOrder, newOrder.length === 0 ? 'open' : 'occupied');
  };

  const removeItem = (itemName: string) => {
    const newOrder = order.filter(o => o.name !== itemName);
    saveTable(newOrder, newOrder.length === 0 ? 'open' : 'occupied');
  };

  const requestVoid = () => {
    setPendingAction('void');
    setShowPinModal(true);
  };

  const executeVoid = () => {
    saveTable([], 'open');
    logActivity('SALE', 'ORDER_VOIDED', `Order for Table ${tableId} voided`, { items: order });
    alert("Order Voided.");
    setShowPinModal(false);
    setPendingAction(null);
  };

  const updateInventorySales = (orderItems: any[]) => {
    const savedInventory = localStorage.getItem('inventory_data');
    if (!savedInventory) return;
    let inv = JSON.parse(savedInventory);
    orderItems.forEach((orderItem) => {
      const idx = inv.findIndex((i: any) => i.name === orderItem.name);
      if (idx !== -1) {
        inv[idx].sales = (inv[idx].sales || 0) + orderItem.qty;
        inv[idx].actual = (inv[idx].actual || 0) - orderItem.qty;
      }
    });
    localStorage.setItem('inventory_data', JSON.stringify(inv));
  };

  // --- Calculations ---

  const subTotal = order.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discountAmount = discountType === 'percent' ? (subTotal * (discountValue / 100)) : discountValue;
  const taxableAmount = subTotal - discountAmount;
  const vatAmount = taxSettings.vatEnabled ? (taxableAmount * (taxSettings.vatRate / 100)) : 0;
  const serviceAmount = taxSettings.serviceChargeEnabled ? (taxableAmount * (taxSettings.serviceChargeRate / 100)) : 0;
  const grandTotal = taxableAmount + vatAmount + serviceAmount;

  // --- Payment Actions ---

  const finalizePayment = async () => {
    if (order.length === 0) return;
    const saleRecord = {
      date: new Date().toISOString(), tableId, items: [...order], subTotal,
      discount: discountAmount, vat: vatAmount, serviceCharge: serviceAmount,
      tip: tipAmount, total: grandTotal, waiter: tableData.waiter, paymentMethod,
      customer_id: null, room_id: null
    };
    
    const history = JSON.parse(localStorage.getItem('sales_history') || '[]');
    history.push(saleRecord);
    localStorage.setItem('sales_history', JSON.stringify(history));
    updateInventorySales(order);
    
    logActivity('SALE', 'PAYMENT_RECEIVED', `Table ${tableId} paid KES ${formatMoney(grandTotal)} via ${paymentMethod}`, { amount: grandTotal, method: paymentMethod });

    await saveRecord('sales', saleRecord);

    saveTable([], 'open');
    setTipAmount(0); setDiscountValue(0);
    setPaidAmount(0); // Reset paid
    setShowPaymentModal(false);
    router.push('/pos');
  };

  const handlePostToRoom = async () => {
    if (!selectedRoomId) return alert("Select a Room");
    const guest = roomAssignments[Number(selectedRoomId)];
    if (!guest) return alert("This room is Vacant.");

    const saleRecord = {
      date: new Date().toISOString(), tableId, items: [...order], subTotal,
      discount: discountAmount, vat: vatAmount, serviceCharge: serviceAmount,
      total: grandTotal, waiter: tableData.waiter, paymentMethod: 'Room Charge',
      customer_id: guest.id, customer_name: guest.name, room_id: Number(selectedRoomId)
    };

    const history = JSON.parse(localStorage.getItem('sales_history') || '[]');
    history.push(saleRecord);
    localStorage.setItem('sales_history', JSON.stringify(history));
    updateInventorySales(order);
    await saveRecord('sales', saleRecord);

    logActivity('SALE', 'POST_TO_ROOM', `Table ${tableId} posted KES ${formatMoney(grandTotal)} to Room ${selectedRoomId}`, { amount: grandTotal, guest: guest.name });

    saveTable([], 'open');
    alert(`Posted to Room ${selectedRoomId} for ${guest.name}!`);
    setShowCustomerModal(false);
    router.push('/pos');
  };

  const handleSplitPayment = () => {
    if (splitAmount <= 0 || splitAmount >= grandTotal) return alert("Invalid split amount");
    
    const saleRecord = {
      date: new Date().toISOString(),
      tableId, 
      items: [{ name: `Partial Payment`, price: splitAmount, qty: 1 }],
      total: splitAmount,
      waiter: tableData.waiter,
      paymentMethod: 'Split Payment',
    };

    const history = JSON.parse(localStorage.getItem('sales_history') || '[]');
    history.push(saleRecord);
    localStorage.setItem('sales_history', JSON.stringify(history));

    logActivity('SALE', 'SPLIT_PAYMENT', `Split payment of KES ${formatMoney(splitAmount)} received on Table ${tableId}`, { amount: splitAmount });

    const newPaidAmount = paidAmount + splitAmount;
    
    const savedTables = localStorage.getItem('pos_tables_data');
    if (savedTables) {
      let tables = JSON.parse(savedTables);
      const idx = tables.findIndex((t: any) => t.id === tableId);
      if (idx !== -1) {
        tables[idx].paid = newPaidAmount;
        localStorage.setItem('pos_tables_data', JSON.stringify(tables));
        setPaidAmount(newPaidAmount);
      }
    }

    alert(`Payment of KES ${formatMoney(splitAmount)} recorded.`);
    setSplitAmount(0);
    setShowSplitModal(false);
  };

  const printBill = () => { window.print(); };
  const sendToKitchen = () => { saveTable(order, 'pending'); alert('Kitchen notified!'); };

  const currentDate = new Date().toLocaleDateString('en-GB');
  const isBasic = plan === 'Basic';
  const isRegular = plan === 'Regular';
  const isPro = plan === 'Pro';
  const hasKitchenItems = order.some((item) => item.type === 'kitchen');
  const balanceDue = grandTotal - paidAmount;

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      
      {/* Modals (Pin, Discount, Customer, Payment, Transfer, Split) */}
      {showPinModal && ( <PinModal onClose={() => { setShowPinModal(false); setPendingAction(null); }} onSuccess={() => { if (pendingAction === 'void') executeVoid(); if (pendingAction === 'discount') { setShowDiscountModal(true); }} /> )}
      
      {showDiscountModal && ( <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"><div className="bg-gray-800 p-6 rounded-xl w-full max-w-xs"><h2 className="text-xl font-bold mb-4 text-orange-400">Apply Discount</h2><div className="flex gap-2 mb-4"><button onClick={() => setDiscountType('fixed')} className={`flex-1 py-2 rounded text-sm ${discountType === 'fixed' ? 'bg-orange-500 text-black' : 'bg-gray-700'}`}>KES</button><button onClick={() => setDiscountType('percent')} className={`flex-1 py-2 rounded text-sm ${discountType === 'percent' ? 'bg-orange-500 text-black' : 'bg-gray-700'}`}>%</button></div><input type="number" placeholder="Amount" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} className="w-full bg-gray-700 p-3 rounded mb-4" /><div className="flex gap-2"><button onClick={() => { setDiscountValue(0); setShowDiscountModal(false); }} className="w-full bg-gray-600 py-2 rounded font-bold">Cancel</button><button onClick={() => setShowDiscountModal(false)} className="w-full bg-green-600 py-2 rounded font-bold">Apply</button></div></div></div> )}
      
      {showCustomerModal && ( <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"><div className="bg-gray-800 p-6 rounded-xl w-full max-w-md"><h2 className="text-xl font-bold mb-4 text-teal-400">Post to Room</h2><div className="space-y-4"><div><label className="text-xs text-gray-400">Select Occupied Room</label><select value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)} className="w-full bg-gray-700 p-2 rounded mt-1"><option value="">Select...</option>{availableRooms.map(r => { const guest = roomAssignments[r.id]; if (!guest) return null; return <option key={r.id} value={r.id}>{r.name} - {guest.name}</option> })}</select></div></div><div className="flex gap-2 mt-6"><button onClick={() => setShowCustomerModal(false)} className="w-full bg-gray-600 py-2 rounded font-bold">Cancel</button><button onClick={handlePostToRoom} className="w-full bg-teal-600 py-2 rounded font-bold">Post Charge</button></div></div></div> )}
      
      {showPaymentModal && ( <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"><div className="bg-gray-800 p-6 rounded-xl w-full max-w-sm"><h2 className="text-xl font-bold mb-4 text-green-400">Complete Payment</h2><p className="text-gray-400 mb-2">Total: <span className="text-white font-bold text-lg">KES {formatMoney(grandTotal)}</span></p><div className="grid grid-cols-3 gap-2 my-4"><button onClick={() => setPaymentMethod('Cash')} className={`p-3 rounded font-bold text-sm ${paymentMethod === 'Cash' ? 'bg-green-600' : 'bg-gray-700'}`}>Cash</button><button onClick={() => setPaymentMethod('M-Pesa')} className={`p-3 rounded font-bold text-sm ${paymentMethod === 'M-Pesa' ? 'bg-blue-600' : 'bg-gray-700'}`}>M-Pesa</button><button onClick={() => setPaymentMethod('Card')} className={`p-3 rounded font-bold text-sm ${paymentMethod === 'Card' ? 'bg-purple-600' : 'bg-gray-700'}`}>Card</button></div><div className="mb-4"><label className="text-xs text-gray-400">Add Tip</label><input type="number" value={tipAmount} onChange={(e) => setTipAmount(Number(e.target.value))} placeholder="0.00" className="w-full bg-gray-700 p-2 rounded mt-1" /></div><button onClick={finalizePayment} className="w-full bg-orange-500 py-3 rounded font-bold text-black mb-2">Pay Now</button><button onClick={() => { setShowPaymentModal(false); setShowCustomerModal(true); }} className="w-full bg-teal-700 hover:bg-teal-600 py-2 rounded font-bold text-sm">Post to Room</button><button onClick={() => setShowPaymentModal(false)} className="w-full bg-gray-700 py-2 rounded text-xs mt-2">Cancel</button></div></div> )}
      
      {showTransferModal && ( <TransferModal currentTableId={tableId} onClose={() => setShowTransferModal(false)} onSuccess={() => { setShowTransferModal(false); router.push('/pos'); }} /> )}
      
      {showSplitModal && ( <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"><div className="bg-gray-800 p-6 rounded-xl w-full max-w-sm"><h2 className="text-xl font-bold mb-4 text-yellow-400">Split Bill</h2><p className="text-xs text-gray-400 mb-2">Total Due: KES {formatMoney(balanceDue)}</p><label className="text-xs text-gray-400">Enter Amount to Pay Now</label><input type="number" value={splitAmount} onChange={(e) => setSplitAmount(Number(e.target.value))} className="w-full bg-gray-700 p-3 rounded mt-1 mb-4 text-xl font-bold" /><div className="flex gap-2"><button onClick={() => setShowSplitModal(false)} className="w-full bg-gray-600 py-2 rounded font-bold">Cancel</button><button onClick={handleSplitPayment} className="w-full bg-yellow-500 text-black py-2 rounded font-bold">Pay Split</button></div></div></div> )}

      {/* Alert */}
      {alertMessage && ( <div className="fixed top-0 left-0 right-0 bg-orange-500 text-black text-center py-2 font-bold z-[100] animate-pulse shadow-lg">{alertMessage}</div> )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 flex justify-between items-center border-b border-gray-700 pb-4">
          <div>
            <Link href="/pos" className="text-orange-400 text-sm">&larr; All Tables</Link>
            <h1 className="text-3xl font-bold mt-2">Table {tableId}</h1>
            <p className="text-xs text-gray-400">Plan: {plan} | Staff: {tableData.waiter}</p>
          </div>
          {!isBasic && ( <div className="flex items-center gap-2"><span className="text-xs text-gray-400">Print:</span><button onClick={() => setCanPrint(!canPrint)} className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${canPrint ? 'bg-green-500' : 'bg-gray-600'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${canPrint ? 'translate-x-6' : 'translate-x-0'}`}></div></button></div> )}
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Menu */}
          <div>
            <h2 className="text-lg font-bold mb-3 text-gray-300 border-b border-gray-700 pb-2">Menu</h2>
            <div className="grid grid-cols-2 gap-2">
              {menu.map((item) => {
                const stock = getStockLevel(item.name);
                const isOutOfStock = stock !== null && stock <= 0;
                return (
                  <button key={item.id || item.name} onClick={() => addToOrder(item)} disabled={isOutOfStock} className={`p-3 rounded-lg text-left border transition-all text-sm ${isOutOfStock ? 'bg-gray-800 border-gray-700 opacity-50 cursor-not-allowed' : 'bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-500'}`}>
                    <div className="flex justify-between items-start"><p className="font-bold text-gray-100">{item.name}</p>{stock !== null && (<span className={`text-[10px] px-1.5 py-0.5 rounded ${stock > 0 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>{stock}</span>)}</div>
                    <p className="text-orange-400 mt-1">KES {formatMoney(item.price)}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bill */}
          <div className="bg-white text-gray-800 rounded-xl shadow-lg flex flex-col print:shadow-none h-fit sticky top-4">
            <div className="p-4 border-b border-gray-100"><div className="flex justify-between items-center"><h2 className="text-lg font-bold text-gray-900">Current Bill</h2><span className="text-xs text-gray-400 font-mono">TBL-{tableId}</span></div></div>
            <div className="p-4 flex-1 overflow-auto max-h-[400px]">
              {order.length === 0 ? (<div className="flex flex-col items-center justify-center h-32 text-gray-400"><p className="text-sm font-medium">No items added yet</p></div>) : (
                <div className="space-y-3">
                  {order.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-sm group">
                      <div className="flex items-start gap-3">
                        <div className="flex gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => decreaseQty(item.name)} className="bg-gray-100 hover:bg-red-100 text-red-500 w-5 h-5 rounded text-xs flex items-center justify-center font-bold">-</button>
                          <button onClick={() => removeItem(item.name)} className="bg-gray-100 hover:bg-red-100 text-red-500 w-5 h-5 rounded text-xs flex items-center justify-center font-bold">×</button>
                        </div>
                        <div className="ml-2 group-hover:ml-0 transition-all"><p className="font-medium text-gray-800">{item.name}</p><p className="text-xs text-gray-400">{item.qty} × KES {formatMoney(item.price)}</p></div>
                      </div>
                      <span className="font-bold text-gray-900 whitespace-nowrap">KES {formatMoney(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-100">
              <div className="space-y-1 text-xs mb-3">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>KES {formatMoney(subTotal)}</span></div>
                {discountAmount > 0 && (<div className="flex justify-between text-green-600"><span>Discount</span><span>- KES {formatMoney(discountAmount)}</span></div>)}
                {taxSettings.vatEnabled && (<div className="flex justify-between text-gray-500"><span>VAT (16%)</span><span>KES {formatMoney(vatAmount)}</span></div>)}
                {taxSettings.serviceChargeEnabled && (<div className="flex justify-between text-gray-500"><span>Service</span><span>KES {formatMoney(serviceAmount)}</span></div>)}
              </div>
              <div className="flex justify-between text-xl font-bold mb-4 text-gray-900 border-t border-dashed pt-2 mt-2"><span>TOTAL</span><span>KES {formatMoney(grandTotal)}</span></div>
              
              {paidAmount > 0 && ( <div className="bg-blue-50 p-2 rounded text-center text-sm mb-3 border border-blue-100"><p className="text-gray-600">Paid: <span className="font-bold text-blue-700">KES {formatMoney(paidAmount)}</span></p><p className="text-gray-800 font-bold mt-1">Balance Due: KES {formatMoney(balanceDue)}</p></div> )}

              <div className="space-y-2">
                {isBasic && ( <button onClick={() => setShowPaymentModal(true)} disabled={order.length === 0} className={`w-full py-3 rounded-lg font-bold transition-all ${order.length > 0 ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Complete Order</button> )}
                {!isBasic && !isRegular && !isPro && (
                  <>
                    <button onClick={printBill} disabled={order.length === 0 || !canPrint} className={`w-full py-2.5 rounded-lg font-bold border transition-all text-sm ${order.length > 0 && canPrint ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>Print Bill</button>
                    <button onClick={() => { setPendingAction('discount'); setShowPinModal(true); }} disabled={order.length === 0} className="w-full bg-gray-100 hover:bg-gray-200 py-2 rounded text-xs text-gray-600 border border-gray-200"> {discountAmount > 0 ? 'Modify Discount' : 'Add Discount'} </button>
                    <button onClick={() => setShowPaymentModal(true)} disabled={order.length === 0} className={`w-full py-3 rounded-lg font-bold transition-all ${order.length > 0 ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Process Payment</button>
                    {order.length > 0 && <button onClick={requestVoid} className="w-full bg-transparent hover:bg-red-50 py-2 rounded text-xs text-red-500 border border-red-100">Void Order</button>}
                  </>
                )}
                {(isRegular || isPro) && (
                  <>
                    {tableData.status !== 'pending' && tableData.status !== 'ready' && ( <button onClick={sendToKitchen} disabled={order.length === 0} className={`w-full py-2.5 rounded-lg font-bold border transition-all text-sm ${order.length > 0 ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>Send to Kitchen</button> )}
                    {tableData.status === 'pending' && ( <Link href="/kitchen" className="block w-full bg-yellow-400 text-black p-2.5 rounded-lg text-center font-bold text-sm">Sent to Kitchen</Link> )}
                    {tableData.status === 'ready' && ( <div className="bg-green-400 text-black p-2.5 rounded-lg text-center font-bold text-sm">Food Ready!</div> )}
                    <button onClick={printBill} disabled={!canPrint} className="w-full bg-white hover:bg-gray-50 py-2 rounded font-bold text-xs border border-gray-200 text-gray-700">Print</button>
                    <button onClick={() => setShowPaymentModal(true)} disabled={order.length === 0} className={`w-full py-2.5 rounded-lg font-bold transition-all text-sm ${order.length > 0 ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Pay</button>
                    {plan === 'Pro' && order.length > 0 && ( <div className="grid grid-cols-2 gap-2 mt-2"><button onClick={() => setShowTransferModal(true)} className="bg-gray-600 hover:bg-gray-500 py-2 rounded text-xs font-bold border border-gray-500 text-white">Transfer</button><button onClick={() => setShowSplitModal(true)} className="bg-gray-600 hover:bg-gray-500 py-2 rounded text-xs font-bold border border-gray-500 text-white">Split Bill</button></div> )}
                    {order.length > 0 && <button onClick={requestVoid} className="w-full bg-transparent hover:bg-red-50 py-2 rounded text-xs text-red-500 border border-red-100">Void</button>}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden print:block mt-8 bg-white">
          <Receipt tableId={tableId} items={order} subTotal={subTotal} discount={discountAmount} vat={vatAmount} service={serviceAmount} total={grandTotal} date={currentDate} />
        </div>
      </div>
    </main>
  );
}