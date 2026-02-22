 "use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/utils';
import { logActivity } from '@/lib/logger'; // NEW

export default function RoomsPage() {
  const [plan, setPlan] = useState('Basic');
  const [rooms, setRooms] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<{ [key: number]: any }>({});
  const [customerBills, setCustomerBills] = useState<{ [key: number]: number }>({});
  
  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [roomPrice, setRoomPrice] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [startNumber, setStartNumber] = useState(1);

  // Payment & Folio Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [activeRoomPay, setActiveRoomPay] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  
  const [showFolioModal, setShowFolioModal] = useState(false);
  const [folioRecords, setFolioRecords] = useState<any[]>([]);

  useEffect(() => {
    const activePlan = localStorage.getItem('activePlan') || 'Basic';
    setPlan(activePlan);
    if (activePlan === 'Pro') {
      loadData();
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  const loadData = () => {
    const savedInventory = localStorage.getItem('inventory_data');
    if (savedInventory) {
      const allItems = JSON.parse(savedInventory);
      setRooms(allItems.filter((item: any) => item.category === 'Rooms'));
    }

    const savedAssignments = localStorage.getItem('room_assignments');
    if (savedAssignments) setAssignments(JSON.parse(savedAssignments));

    const history = JSON.parse(localStorage.getItem('sales_history') || '[]');
    const bills: { [key: number]: number } = {};
    
    history.forEach((sale: any) => {
      if (sale.customer_id) {
        if (sale.paymentMethod === 'Room Charge') bills[sale.customer_id] = (bills[sale.customer_id] || 0) + sale.total;
        if (sale.paymentMethod === 'Reception Payment') bills[sale.customer_id] = (bills[sale.customer_id] || 0) - sale.total;
      }
    });
    setCustomerBills(bills);
  };

  const handleAddRoom = () => {
    if (!categoryName || quantity < 1) return alert("Enter Category and Quantity");
    const savedInventory = localStorage.getItem('inventory_data');
    const inv = savedInventory ? JSON.parse(savedInventory) : [];
    
    for (let i = 0; i < quantity; i++) {
      const currentNum = Number(startNumber) + i;
      const roomName = `${categoryName} - ${currentNum}`;
      const newRoom = { id: Date.now() + i, name: roomName, category: 'Rooms', type: categoryName, price: roomPrice, status: 'vacant', opening: 1, purchases: 0, sales: 0, actual: 1, reorder: 0 };
      inv.push(newRoom);
    }
    localStorage.setItem('inventory_data', JSON.stringify(inv));
    
    // NEW: Audit Log
    logActivity('INVENTORY', 'ROOM_CREATED', `Added ${quantity} ${categoryName} rooms starting at ${startNumber}`, { category: categoryName, qty: quantity });
    
    setShowAddModal(false);
    loadData();
  };

  const toggleMaintenance = (roomId: number, currentStatus: string) => {
    const savedInventory = localStorage.getItem('inventory_data');
    if (!savedInventory) return;
    let inv = JSON.parse(savedInventory);
    const idx = inv.findIndex((i: any) => i.id === roomId);
    if (idx !== -1) {
      const newStatus = currentStatus === 'maintenance' ? 'vacant' : 'maintenance';
      inv[idx].status = newStatus;
      localStorage.setItem('inventory_data', JSON.stringify(inv));
      
      // NEW: Audit Log
      logActivity('ROOM', 'MAINTENANCE_TOGGLE', `Room ${inv[idx].name} set to ${newStatus.toUpperCase()}`, { roomId, newStatus });

      loadData();
    }
  };

  const openFolio = (roomId: number) => {
    const guest = assignments[roomId];
    if (!guest) return;
    const history = JSON.parse(localStorage.getItem('sales_history') || '[]');
    const records = history.filter((s: any) => s.customer_id === guest.id);
    setFolioRecords(records);
    setActiveRoomPay(rooms.find(r => r.id === roomId));
    setShowFolioModal(true);
  };

  const handlePaymentSubmit = () => {
    if (!activeRoomPay || paymentAmount <= 0) return;
    const guest = assignments[activeRoomPay.id];
    const receptionist = localStorage.getItem('current_staff') || 'Reception';

    const saleRecord = {
      date: new Date().toISOString(),
      items: [{ name: `Payment Received (${paymentMethod})`, price: paymentAmount, qty: 1 }],
      total: paymentAmount, customer_id: guest.id, room_id: activeRoomPay.id,
      paymentMethod: 'Reception Payment', waiter: receptionist, subMethod: paymentMethod
    };

    const history = JSON.parse(localStorage.getItem('sales_history') || '[]');
    history.push(saleRecord);
    localStorage.setItem('sales_history', JSON.stringify(history));

    // NEW: Audit Log
    logActivity('ROOM', 'ROOM_PAYMENT', `Received KES ${formatMoney(paymentAmount)} for Room ${activeRoomPay.name} (${paymentMethod})`, { amount: paymentAmount, method: paymentMethod, guest: guest.name });

    setShowPayModal(false);
    setActiveRoomPay(null);
    setPaymentAmount(0);
    loadData();
  };

  const openPayModal = (room: any) => {
    setActiveRoomPay(room);
    setPaymentAmount(customerBills[assignments[room.id]?.id] || 0);
    setShowPayModal(true);
  };

  const handleCheckout = (roomId: number) => {
    const guest = assignments[roomId];
    if (!guest) return;
    const bill = customerBills[guest.id] || 0;

    if (bill > 0.5) {
      alert(`Cannot check out! Pending bill: KES ${formatMoney(bill)}. Use "View Folio" to settle.`);
      return;
    }

    if (confirm(`Check out ${guest.name}?`)) {
      const room = rooms.find(r => r.id === roomId);
      const newAssignments = { ...assignments };
      delete newAssignments[roomId];
      localStorage.setItem('room_assignments', JSON.stringify(newAssignments));

      const savedInventory = localStorage.getItem('inventory_data');
      if (savedInventory) {
        let inv = JSON.parse(savedInventory);
        const idx = inv.findIndex((i: any) => i.id === roomId);
        if (idx !== -1) {
          inv[idx].status = 'vacant';
          localStorage.setItem('inventory_data', JSON.stringify(inv));
        }
      }
      
      // NEW: Audit Log
      logActivity('ROOM', 'CHECKOUT', `${guest.name} checked out of ${room?.name}`, { roomId, guest: guest.name });

      loadData();
    }
  };

  if (plan !== 'Pro') {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Pro Feature</h1>
        <p className="text-gray-400 mb-8">Room Management is available on Pro plans only.</p>
        <Link href="/pos" className="bg-blue-600 px-6 py-2 rounded-lg">Back to Dashboard</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md border border-gray-600">
            <h2 className="text-xl font-bold mb-4 text-teal-400">Add Room Batch</h2>
            <div className="space-y-3">
               <input type="text" placeholder="Category (Single, Double)" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="w-full bg-gray-700 p-3 rounded" />
               <input type="number" placeholder="Price" value={roomPrice} onChange={(e) => setRoomPrice(Number(e.target.value))} className="w-full bg-gray-700 p-3 rounded" />
               <div className="grid grid-cols-2 gap-2">
                 <input type="number" placeholder="Qty" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="bg-gray-700 p-2 rounded" />
                 <input type="number" placeholder="Start #" value={startNumber} onChange={(e) => setStartNumber(Number(e.target.value))} className="bg-gray-700 p-2 rounded" />
               </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowAddModal(false)} className="w-full bg-gray-600 py-2 rounded">Cancel</button>
              <button onClick={handleAddRoom} className="w-full bg-teal-600 py-2 rounded font-bold">Save</button>
            </div>
          </div>
        </div>
      )}

      {showFolioModal && activeRoomPay && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-lg border border-gray-600 max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Guest Folio</h2>
              <button onClick={() => setShowFolioModal(false)} className="text-gray-400 hover:text-white text-xl">X</button>
            </div>
            <div className="mb-4 border-b border-gray-700 pb-2">
              <p className="text-sm text-gray-400">Room: <span className="text-white font-bold">{activeRoomPay.name}</span></p>
              <p className="text-sm text-gray-400">Guest: <span className="text-white font-bold">{assignments[activeRoomPay.id]?.name}</span></p>
            </div>
            <table className="w-full text-left text-xs mb-4">
              <thead className="border-b border-gray-600">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Description</th>
                  <th className="p-2 text-right">Charges</th>
                  <th className="p-2 text-right">Payments</th>
                </tr>
              </thead>
              <tbody>
                {folioRecords.map((rec, i) => (
                  <tr key={i} className="border-b border-gray-700">
                    <td className="p-2 text-gray-400">{new Date(rec.date).toLocaleString()}</td>
                    <td className="p-2">{rec.items.map((it: any) => it.name).join(', ')} <span className="block text-[10px] text-teal-400">By: {rec.waiter}</span></td>
                    <td className="p-2 text-right text-red-400">{rec.paymentMethod === 'Room Charge' ? formatMoney(rec.total) : '-'}</td>
                    <td className="p-2 text-right text-green-400">{rec.paymentMethod === 'Reception Payment' ? formatMoney(rec.total) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-gray-600 pt-2 text-right">
                <p className="text-lg font-bold text-orange-400">Balance: KES {formatMoney(customerBills[assignments[activeRoomPay.id]?.id] || 0)}</p>
            </div>
            <button onClick={() => { setShowFolioModal(false); openPayModal(activeRoomPay); }} className="w-full bg-green-600 py-2 rounded font-bold mt-4">Receive Payment</button>
          </div>
        </div>
      )}

      {showPayModal && activeRoomPay && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-sm border border-gray-600">
            <h2 className="text-xl font-bold mb-2 text-green-400">Receive Payment</h2>
            <p className="text-sm text-gray-300 mb-4">Room: {activeRoomPay.name}</p>
            <div className="mb-4">
              <label className="text-xs text-gray-400">Amount</label>
              <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} className="w-full bg-gray-700 p-3 rounded mt-1 text-lg font-bold" />
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button onClick={() => setPaymentMethod('Cash')} className={`p-2 rounded text-sm ${paymentMethod === 'Cash' ? 'bg-green-600' : 'bg-gray-700'}`}>Cash</button>
              <button onClick={() => setPaymentMethod('M-Pesa')} className={`p-2 rounded text-sm ${paymentMethod === 'M-Pesa' ? 'bg-blue-600' : 'bg-gray-700'}`}>M-Pesa</button>
              <button onClick={() => setPaymentMethod('Card')} className={`p-2 rounded text-sm ${paymentMethod === 'Card' ? 'bg-purple-600' : 'bg-gray-700'}`}>Card</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPayModal(false)} className="w-full bg-gray-600 py-2 rounded font-bold">Cancel</button>
              <button onClick={handlePaymentSubmit} className="w-full bg-green-600 py-2 rounded font-bold">Confirm</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-teal-400">Room Management</h1>
            <p className="text-gray-400 text-sm">Audit & Reconciliation</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddModal(true)} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-sm font-bold">+ Add Rooms</button>
            <Link href="/customers" className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-sm font-bold">Check In</Link>
            <Link href="/pos" className="bg-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-500">Back</Link>
          </div>
        </header>

        <div className="flex gap-4 mb-6 text-xs">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-600"></div> Vacant</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-600"></div> Occupied</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-orange-500"></div> Maintenance</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {rooms.map((room) => {
            const guest = assignments[room.id];
            const bill = guest ? (customerBills[guest.id] || 0) : 0;
            let status = 'vacant';
            let colorClass = 'bg-green-800 border-green-500';
            let statusText = 'Vacant';

            if (room.status === 'maintenance') {
              status = 'maintenance'; colorClass = 'bg-orange-800 border-orange-500'; statusText = 'Maintenance';
            } else if (guest) {
              status = 'occupied'; colorClass = 'bg-red-800 border-red-500'; statusText = 'Occupied';
            }

            return (
              <div key={room.id} className={`p-4 rounded-xl border-2 transition-all ${colorClass} flex flex-col justify-between min-h-[220px]`}>
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold">{room.name}</h3>
                    <span className="text-[10px] bg-black bg-opacity-40 px-2 py-0.5 rounded uppercase">{statusText}</span>
                  </div>
                  <p className="text-xs text-gray-300 mb-2">KES {formatMoney(room.price)}/night</p>
                  {guest ? (
                    <div className="bg-black bg-opacity-30 p-2 rounded text-xs">
                      <p className="font-bold text-white">{guest.name}</p>
                      <p className="text-gray-200">{guest.mobile}</p>
                      <p className={`mt-1 font-bold ${bill > 0 ? 'text-yellow-300' : 'text-green-300'}`}>Bill: KES {formatMoney(bill)}</p>
                    </div>
                  ) : ( <p className="text-gray-200 text-xs py-4">Ready for use</p> )}
                </div>

                <div className="mt-3 space-y-2">
                  {status === 'occupied' && (
                    <>
                      <button onClick={() => openFolio(room.id)} className="w-full bg-gray-600 hover:bg-gray-500 py-2 rounded text-xs font-bold border border-gray-400">View Folio / Details</button>
                      <button onClick={() => handleCheckout(room.id)} className="w-full bg-gray-900 hover:bg-black py-2 rounded text-xs font-bold border border-white">Check Out</button>
                    </>
                  )}
                  {status === 'vacant' && ( <Link href="/customers" className="block w-full bg-teal-600 hover:bg-teal-500 py-2 rounded text-xs font-bold text-center">Check In</Link> )}
                  {status !== 'maintenance' && ( <button onClick={() => toggleMaintenance(room.id, 'active')} className="w-full bg-orange-900 hover:bg-orange-800 text-orange-300 py-2 rounded text-xs font-bold">Set Maintenance</button> )}
                  {status === 'maintenance' && ( <button onClick={() => toggleMaintenance(room.id, 'maintenance')} className="w-full bg-green-600 hover:bg-green-500 py-2 rounded text-xs font-bold">Mark Fixed</button> )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}