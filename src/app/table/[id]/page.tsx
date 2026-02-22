 // ... existing imports
import TransferModal from '@/components/TransferModal'; // NEW

export default function TableOrderPage() {
  // ... existing states ...
  
  // NEW: Modals for Transfer & Split
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitAmount, setSplitAmount] = useState(0);

  // ... existing logic ...

  // NEW: Split Bill Logic
  const handleSplitPayment = () => {
    if (splitAmount <= 0 || splitAmount >= grandTotal) return alert("Invalid split amount");
    
    // Process payment for the split amount
    const saleRecord = {
      date: new Date().toISOString(),
      tableId, 
      items: [{ name: `Partial Payment (${splitAmount})`, price: splitAmount, qty: 1 }],
      total: splitAmount,
      waiter: tableData.waiter,
      paymentMethod: 'Split Payment',
      note: `Partial payment on Table ${tableId}`
    };

    const history = JSON.parse(localStorage.getItem('sales_history') || '[]');
    history.push(saleRecord);
    localStorage.setItem('sales_history', JSON.stringify(history));

    logActivity('SALE', 'SPLIT_PAYMENT', `Split payment of KES ${formatMoney(splitAmount)} received on Table ${tableId}`, { amount: splitAmount });

    // Update the table total remaining?
    // Actually, split payment reduces the bill. 
    // We need to reduce the total of the items or keep a 'paid' ledger.
    // Simplest way: Deduct from grandTotal visually?
    // For now, let's just record the cash and leave the bill items.
    // A better way is to track "Paid Amount" on the table object.
    
    const savedTables = localStorage.getItem('pos_tables_data');
    if (savedTables) {
      let tables = JSON.parse(savedTables);
      const idx = tables.findIndex((t: any) => t.id === tableId);
      if (idx !== -1) {
        tables[idx].paid = (tables[idx].paid || 0) + splitAmount;
        localStorage.setItem('pos_tables_data', JSON.stringify(tables));
        // Trigger reload of data?
        setTableData(prev => ({ ...prev })); 
      }
    }

    alert(`Payment of KES ${formatMoney(splitAmount)} recorded.`);
    setSplitAmount(0);
    setShowSplitModal(false);
  };

  // Calculate Remaining Balance
  const paidAmount = JSON.parse(localStorage.getItem('pos_tables_data') || '[]').find((t: any) => t.id === tableId)?.paid || 0;
  const balanceDue = grandTotal - paidAmount;

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      
      {/* ... existing modals ... */}

      {/* Transfer Modal */}
      {showTransferModal && (
        <TransferModal 
          currentTableId={tableId} 
          onClose={() => setShowTransferModal(false)} 
          onSuccess={() => { setShowTransferModal(false); router.push('/pos'); }} 
        />
      )}

      {/* Split Modal */}
      {showSplitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-sm border border-gray-600">
            <h2 className="text-xl font-bold mb-4 text-yellow-400">Split Bill</h2>
            <p className="text-xs text-gray-400 mb-2">Total Due: KES {formatMoney(balanceDue)}</p>
            
            <label className="text-xs text-gray-400">Enter Amount to Pay Now</label>
            <input 
              type="number" 
              value={splitAmount} 
              onChange={(e) => setSplitAmount(Number(e.target.value))}
              className="w-full bg-gray-700 p-3 rounded mt-1 mb-4 text-xl font-bold"
            />

            <div className="flex gap-2">
              <button onClick={() => setShowSplitModal(false)} className="w-full bg-gray-600 py-2 rounded font-bold">Cancel</button>
              <button onClick={handleSplitPayment} className="w-full bg-yellow-500 text-black py-2 rounded font-bold">Pay Split</button>
            </div>
          </div>
        </div>
      )}

      {/* ... rest of JSX ... */}

      {/* Inside Action Buttons Area */}
      <div className="space-y-2">
          {/* ... existing buttons ... */}

          {/* NEW: Transfer & Split Buttons (Pro) */}
          {plan === 'Pro' && order.length > 0 && (
             <div className="grid grid-cols-2 gap-2 mt-2">
                <button 
                  onClick={() => setShowTransferModal(true)} 
                  className="bg-gray-600 hover:bg-gray-500 py-2 rounded text-xs font-bold border border-gray-500"
                >
                  Transfer Table
                </button>
                <button 
                  onClick={() => setShowSplitModal(true)} 
                  className="bg-gray-600 hover:bg-gray-500 py-2 rounded text-xs font-bold border border-gray-500"
                >
                  Split Bill
                </button>
             </div>
          )}
          
          {/* Display Balance if Partially Paid */}
          {paidAmount > 0 && (
             <div className="bg-blue-900 p-2 rounded text-center text-sm mt-2">
                Paid: KES {formatMoney(paidAmount)} | Balance: KES {formatMoney(balanceDue)}
             </div>
          )}
      </div>
    </main>
  );
}