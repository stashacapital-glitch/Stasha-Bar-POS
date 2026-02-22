 'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase'; // CORRECT
import PinModal from '@/components/PinModal'; // Ensure this component exists
import toast from 'react-hot-toast';

// --- Types ---
type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
};

type MenuCategory = 'food' | 'drinks' | 'desserts';

export default function TablePage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.id as string;

  // --- State ---
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<MenuCategory>('food');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showPinModal, setShowPinModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  
  // Logic State
  const [pendingAction, setPendingAction] = useState<'void' | 'discount' | null>(null);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [itemToVoid, setItemToVoid] = useState<OrderItem | null>(null);

  const supabase = createClient();

  // --- Effects ---
  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('menu_items') // Adjust table name if needed
      .select('*');

    if (error) {
      toast.error('Failed to load menu');
      console.error(error);
    } else {
      setMenuItems(data || []);
    }
    setLoading(false);
  };

  // --- Order Logic ---
  const addToOrder = (item: any) => {
    setOrder((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`Added ${item.name}`);
  };

  const removeFromOrder = (itemId: string) => {
    setOrder((prev) => prev.filter((i) => i.id !== itemId));
  };

  const calculateTotal = () => {
    const subtotal = order.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discountAmount = 0;

    if (discountValue > 0) {
      if (discountType === 'fixed') {
        discountAmount = discountValue;
      } else {
        discountAmount = subtotal * (discountValue / 100);
      }
    }

    return {
      subtotal,
      discount: discountAmount,
      total: subtotal - discountAmount,
    };
  };

  // --- Action Handlers ---
  
  const handleVoidRequest = (item: OrderItem) => {
    setItemToVoid(item);
    setPendingAction('void');
    setShowPinModal(true);
  };

  const handleDiscountRequest = () => {
    setPendingAction('discount');
    setShowPinModal(true);
  };

  const executeVoid = () => {
    if (itemToVoid) {
      removeFromOrder(itemToVoid.id);
      toast.success('Item voided');
      setItemToVoid(null);
    }
  };

  const handlePinSuccess = () => {
    setShowPinModal(false);
    
    if (pendingAction === 'void') {
      executeVoid();
    } else if (pendingAction === 'discount') {
      setShowDiscountModal(true);
    }
    
    setPendingAction(null);
  };

  const handleSubmitOrder = async () => {
    if (order.length === 0) return;
    
    setLoading(true);
    // Insert order logic here...
    // Example: await supabase.from('orders').insert([...])
    
    toast.success('Order sent to kitchen!');
    setOrder([]);
    setLoading(false);
  };

  const handlePayment = async () => {
    if (order.length === 0) return;
    // Navigate to payment page or process payment
    router.push(`/table/${tableId}/pay`);
  };

  // --- Render ---
  const totals = calculateTotal();

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left Side: Menu */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-orange-400">Table {tableId}</h1>
          <div className="flex gap-2">
            {(['food', 'drinks', 'desserts'] as MenuCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded capitalize ${
                  activeCategory === cat ? 'bg-orange-500 text-black' : 'bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {loading ? (
            <p>Loading menu...</p>
          ) : (
            menuItems
              .filter((item) => item.category === activeCategory)
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToOrder(item)}
                  className="bg-gray-800 p-4 rounded-lg text-left hover:bg-gray-700 transition"
                >
                  <h3 className="font-bold">{item.name}</h3>
                  <p className="text-orange-400">KES {item.price}</p>
                </button>
              ))
          )}
        </div>
      </div>

      {/* Right Side: Order Summary */}
      <div className="w-96 bg-gray-800 p-4 flex flex-col border-l border-gray-700">
        <h2 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">Current Order</h2>
        
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {order.length === 0 ? (
            <p className="text-gray-500 text-center">No items yet</p>
          ) : (
            order.map((item) => (
              <div key={item.id} className="bg-gray-700 p-3 rounded flex justify-between items-center">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-400">
                    {item.quantity} x KES {item.price}
                  </p>
                </div>
                <div className="flex gap-2">
                   <button 
                     onClick={() => handleVoidRequest(item)}
                     className="text-red-500 text-xs hover:underline"
                   >
                     Void
                   </button>
                   <span className="font-bold">KES {item.price * item.quantity}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-gray-600 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>KES {totals.subtotal}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-sm text-green-400">
              <span>Discount:</span>
              <span>- KES {totals.discount}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>KES {totals.total}</span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={handleDiscountRequest}
              className="bg-blue-600 py-2 rounded font-bold hover:bg-blue-500 disabled:opacity-50"
              disabled={order.length === 0}
            >
              Discount
            </button>
            <button
              onClick={handleSubmitOrder}
              className="bg-yellow-600 py-2 rounded font-bold hover:bg-yellow-500 disabled:opacity-50"
              disabled={order.length === 0}
            >
              Send Order
            </button>
            <button
              onClick={handlePayment}
              className="col-span-2 bg-green-600 py-3 rounded font-bold text-lg hover:bg-green-500 disabled:opacity-50"
              disabled={order.length === 0}
            >
              Pay (KES {totals.total})
            </button>
          </div>
        </div>
      </div>

      {/* Modals (Pin, Discount) */}
      
      {/* Fix applied: Properly closed blocks below */}
      {showPinModal && (
        <PinModal
          onClose={() => {
            setShowPinModal(false);
            setPendingAction(null);
          }}
          onSuccess={handlePinSuccess}
        />
      )}

      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-xs">
            <h2 className="text-xl font-bold mb-4 text-orange-400">Apply Discount</h2>
            
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setDiscountType('fixed')}
                className={`flex-1 py-2 rounded text-sm ${
                  discountType === 'fixed' ? 'bg-orange-500 text-black' : 'bg-gray-700'
                }`}
              >
                KES
              </button>
              <button
                onClick={() => setDiscountType('percent')}
                className={`flex-1 py-2 rounded text-sm ${
                  discountType === 'percent' ? 'bg-orange-500 text-black' : 'bg-gray-700'
                }`}
              >
                %
              </button>
            </div>

            <input
              type="number"
              placeholder="Amount"
              value={discountValue || ''}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              className="w-full bg-gray-700 p-3 rounded mb-4 text-white"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDiscountValue(0);
                  setShowDiscountModal(false);
                }}
                className="w-full bg-gray-600 py-2 rounded font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="w-full bg-green-600 py-2 rounded font-bold"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}