 "use client"; // 1. This makes it a Client Component

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 2. Access localStorage ONLY inside useEffect (Client-side only)
    const activePlan = localStorage.getItem('activePlan');
    
    if (activePlan) {
      // If plan exists, go to dashboard
      router.push('/pos');
    } else {
      // If no plan, show the selection screen
      setLoading(false);
    }
  }, [router]);

  // 3. Show loading or the Plan Selection UI
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <p>Loading...</p>
      </main>
    );
  }

  // 4. The Plan Selection UI (Safe to render now)
  const selectPlan = (planName: string) => {
    localStorage.setItem('activePlan', planName);
    router.push('/pos');
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
      <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-lg text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-2 text-orange-400">Stasha Bar POS</h1>
        <p className="text-gray-400 mb-8">Select your plan to begin</p>
        
        <div className="grid gap-4">
          <button onClick={() => selectPlan('Basic')} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold transition-colors">
            Basic Plan
          </button>
          <button onClick={() => selectPlan('Standard')} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-lg font-bold transition-colors">
            Standard Plan
          </button>
          <button onClick={() => selectPlan('Regular')} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-lg font-bold transition-colors">
            Regular Plan
          </button>
          <button onClick={() => selectPlan('Pro')} className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-lg font-bold transition-colors border border-red-400">
            Pro Plan (Full Features)
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-8">
          Powered by StashaPOS
        </p>
      </div>
    </main>
  );
}