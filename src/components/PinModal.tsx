"use client";
import { useState } from 'react';

// Define the props interface for TypeScript
interface PinModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function PinModal({ onClose, onSuccess }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleVerify = () => {
    // Retrieve the PIN from local storage, default to '1234' if not set
    const correctPin = localStorage.getItem('manager_pin') || '1234';
    
    if (pin === correctPin) {
      onSuccess();
    } else {
      setError('Incorrect PIN. Please try again.');
    }
  };

  // Allow submitting with Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-xl w-full max-w-xs border border-gray-600 text-center">
        <h2 className="text-xl font-bold mb-4 text-red-400">Manager Authorization</h2>
        <p className="text-sm text-gray-400 mb-4">Enter Manager PIN to proceed.</p>
        
        <input 
          type="password" 
          inputMode="numeric"
          placeholder="****" 
          value={pin} 
          onChange={(e) => { setPin(e.target.value); setError(''); }}
          onKeyDown={handleKeyDown}
          className="w-full bg-gray-700 text-center text-2xl tracking-[1em] p-3 rounded mb-4 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={4}
          autoFocus
        />
        
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 py-2 rounded font-bold transition-colors">
            Cancel
          </button>
          <button onClick={handleVerify} className="w-full bg-green-600 hover:bg-green-500 py-2 rounded font-bold transition-colors">
            Verify
          </button>
        </div>
      </div>
    </div>
  );
}