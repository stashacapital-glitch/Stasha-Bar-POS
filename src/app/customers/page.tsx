 "use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import { formatMoney } from '@/lib/utils';

export default function CustomersPage() {
  const [plan, setPlan] = useState('Basic');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', mobile: '', id_number: '' });
  const [idFile, setIdFile] = useState<File | null>(null);
  
  // Room State
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [roomCharge, setRoomCharge] = useState(0);
  const [roomAssignments, setRoomAssignments] = useState<{ [key: number]: any }>({});
  const [customerBills, setCustomerBills] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    const activePlan = localStorage.getItem('activePlan') || 'Basic';
    setPlan(activePlan);
    
    if (activePlan === 'Pro') {
      fetchCustomers();
      loadRoomData();
    }
  }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (data) setCustomers(data);
  };

  const loadRoomData = () => {
    const savedInventory = localStorage.getItem('inventory_data');
    if (savedInventory) {
      const allItems = JSON.parse(savedInventory);
      setRooms(allItems.filter((i: any) => i.category === 'Rooms'));
    }

    const savedAssignments = localStorage.getItem('room_assignments');
    if (savedAssignments) setRoomAssignments(JSON.parse(savedAssignments));

    const history = JSON.parse(localStorage.getItem('sales_history') || '[]');
    const bills: { [key: number]: number } = {};
    history.forEach((sale: any) => {
      if (sale.customer_id) {
        bills[sale.customer_id] = (bills[sale.customer_id] || 0) + sale.total;
      }
    });
    setCustomerBills(bills);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdFile(e.target.files[0]);
    }
  };

  const handleRoomChange = (roomId: string) => {
    setSelectedRoom(roomId);
    const room = rooms.find(r => r.id == roomId);
    if (room) setRoomCharge(room.price || 0);
    else setRoomCharge(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let idImageUrl = '';
    if (idFile) {
      const fileExt = idFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('customer_ids').upload(fileName, idFile);
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('customer_ids').getPublicUrl(uploadData.path);
        idImageUrl = urlData.publicUrl;
      }
    }

    const { data: newCustomer, error } = await supabase.from('customers').insert([{
      name: form.name, mobile: form.mobile, id_number: form.id_number, id_image_url: idImageUrl
    }]).select();

    if (error || !newCustomer) {
      alert('Error saving customer: ' + error?.message);
      setLoading(false);
      return;
    }

    const customerData = newCustomer[0];

    if (selectedRoom) {
      const room = rooms.find(r => r.id == selectedRoom);
      if (room) {
        const newAssignments = { ...roomAssignments, [room.id]: customerData };
        localStorage.setItem('room_assignments', JSON.stringify(newAssignments));

        if (roomCharge > 0) {
          const saleRecord = {
            date: new Date().toISOString(),
            items: [{ name: `Room Booking: ${room.name}`, price: roomCharge, qty: 1 }],
            total: roomCharge,
            customer_id: customerData.id,
            customer_name: customerData.name,
            room_id: room.id,
            paymentMethod: 'Room Charge',
            waiter: 'Reception'
          };
          const history = JSON.parse(localStorage.getItem('sales_history') || '[]');
          history.push(saleRecord);
          localStorage.setItem('sales_history', JSON.stringify(history));
        }
        alert(`Checked into Room ${room.name} successfully!`);
      }
    } else {
      alert('Customer saved successfully!');
    }

    setForm({ name: '', mobile: '', id_number: '' });
    setIdFile(null);
    setSelectedRoom('');
    setRoomCharge(0);
    setLoading(false);
    fetchCustomers();
    loadRoomData();
  };

  const getRoomForCustomer = (customerId: number) => {
    const roomId = Object.keys(roomAssignments).find(key => roomAssignments[Number(key)]?.id === customerId);
    const room = rooms.find(r => r.id == Number(roomId));
    return room ? room.name : '-';
  };

  // Access Control
  if (plan !== 'Pro') {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Pro Feature</h1>
        <p className="text-gray-400 mb-8">Customer Management is available on Pro plans only.</p>
        <Link href="/pos" className="bg-blue-600 px-6 py-2 rounded-lg">Back to Dashboard</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-teal-400">Customer Management</h1>
          <div className="flex gap-2">
            <Link href="/rooms" className="bg-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-600">View Rooms</Link>
            <Link href="/pos" className="bg-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-500">Back</Link>
          </div>
        </header>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-8">
          <h2 className="text-xl font-bold mb-4">Add New Customer</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="text" placeholder="Full Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="bg-gray-700 p-3 rounded w-full" required />
              <input type="text" placeholder="Mobile Number" value={form.mobile} onChange={(e) => setForm({...form, mobile: e.target.value})} className="bg-gray-700 p-3 rounded w-full" />
              <input type="text" placeholder="ID / Passport No." value={form.id_number} onChange={(e) => setForm({...form, id_number: e.target.value})} className="bg-gray-700 p-3 rounded w-full" />
            </div>
            
            <input type="file" accept="image/*" onChange={handleFileChange} className="bg-gray-700 p-2 rounded w-full text-sm text-gray-400" />

            <div className="border-t border-gray-700 pt-4 mt-4 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm text-gray-400 block">Assign Room (Optional)</label>
                <Link href="/rooms" className="text-xs text-teal-400 hover:underline">+ Manage Rooms</Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select 
                  value={selectedRoom} 
                  onChange={(e) => handleRoomChange(e.target.value)} 
                  className="bg-gray-700 p-3 rounded w-full border border-gray-600"
                >
                  <option value="">Select Room</option>
                  {rooms.map(r => {
                    const isOccupied = roomAssignments[r.id];
                    // NEW: Exclude rooms under maintenance
                    const isMaintenance = r.status === 'maintenance';
                    
                    if (isOccupied || isMaintenance) return null; 
                    
                    return <option key={r.id} value={r.id}>{r.name} (KES {formatMoney(r.price)})</option>
                  })}
                </select>

                <div className="flex gap-2">
                  <span className="bg-gray-600 p-3 rounded-l text-gray-300">KES</span>
                  <input type="number" placeholder="Charge Amount" value={roomCharge} onChange={(e) => setRoomCharge(Number(e.target.value))} className="bg-gray-700 p-3 rounded-r w-full text-white font-bold flex-1" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-500 py-3 rounded font-bold mt-4">
              {loading ? 'Saving...' : 'Save Customer'}
            </button>
          </form>
        </div>

        <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
          <table className="w-full text-left">
            <thead className="bg-gray-700 border-b border-gray-600">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Mobile</th>
                <th className="p-4">Room</th>
                <th className="p-4">Current Bill</th>
                <th className="p-4">ID</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-gray-700">
                  <td className="p-4 font-bold">{c.name}</td>
                  <td className="p-4">{c.mobile}</td>
                  <td className="p-4 text-teal-400 font-bold">{getRoomForCustomer(c.id)}</td>
                  <td className="p-4 text-orange-400 font-bold">KES {formatMoney(customerBills[c.id] || 0)}</td>
                  <td className="p-4">
                    {c.id_image_url && <a href={c.id_image_url} target="_blank" className="text-blue-400 text-xs hover:underline">View</a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}