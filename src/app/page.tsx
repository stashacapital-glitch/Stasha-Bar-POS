 "use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.push('/pos');
      else setIsLoading(false);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.push('/pos');
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const selectPlan = (planName: string) => {
    localStorage.setItem('activePlan', planName);
    router.push('/pos');
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) alert(error.message);
  };

  if (isLoading) return <main className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</main>;

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-orange-500 mb-2">The Dev Bar POS</h1>
          <p className="text-gray-400">Professional Point of Sale System</p>
        </div>

        {/* Google Login */}
        <div className="max-w-md mx-auto mb-12">
          <button onClick={handleGoogleLogin} className="w-full bg-white text-black py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-100 shadow-lg">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Sign in with Google
          </button>
          <p className="text-center text-gray-500 text-xs mt-3">Or start in Offline Mode below</p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* PLAN 1: BASIC */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col hover:border-gray-500 transition-all">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-gray-300">Basic</h2>
              <p className="text-4xl font-extrabold mt-2">Free</p>
              <p className="text-gray-500 text-sm">14-Day Trial</p>
            </div>
            <div className="p-6 flex-1">
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><span className="text-green-500">✔</span> 5 Tables Limit</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✔</span> Order Taking</li>
                <li className="flex items-center gap-2 text-gray-500"><span className="text-red-500">✖</span> No Printing</li>
                <li className="flex items-center gap-2 text-gray-500"><span className="text-red-500">✖</span> No Taxes/Payroll</li>
                <li className="flex items-center gap-2 text-gray-500"><span className="text-red-500">✖</span> No Inventory</li>
              </ul>
            </div>
            <div className="p-6 pt-0">
              <button onClick={() => selectPlan('Basic')} className="w-full bg-gray-600 hover:bg-gray-500 py-3 rounded-lg font-bold">Start Free</button>
            </div>
          </div>

          {/* PLAN 2: STANDARD */}
          <div className="bg-gray-800 rounded-xl border border-blue-500 flex flex-col shadow-lg shadow-blue-500/10 relative">
            <div className="absolute top-0 right-0 bg-blue-600 text-xs px-2 py-1 rounded-bl font-bold">POPULAR</div>
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-blue-400">Standard</h2>
              <p className="text-4xl font-extrabold mt-2">KES 2,500</p>
              <p className="text-gray-500 text-sm">Per Month</p>
            </div>
            <div className="p-6 flex-1">
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><span className="text-green-500">✔</span> <span className="font-bold text-white">10 Tables Limit</span></li>
                <li className="flex items-center gap-2"><span className="text-green-500">✔</span> Receipt Printing</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✔</span> Inventory Management</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✔</span> Payment Tracking (Cash/M-Pesa)</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✔</span> Simple Payroll & Taxes</li>
                <li className="flex items-center gap-2 text-gray-500"><span className="text-red-500">✖</span> No Kitchen Module</li>
              </ul>
            </div>
            <div className="p-6 pt-0">
              <button onClick={() => selectPlan('Standard')} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold">Choose Standard</button>
            </div>
          </div>

          {/* PLAN 3: REGULAR */}
          <div className="bg-gray-800 rounded-xl border border-purple-500 flex flex-col shadow-lg shadow-purple-500/10">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-purple-400">Regular</h2>
              <p className="text-4xl font-extrabold mt-2">KES 5,000</p>
              <p className="text-gray-500 text-sm">Per Month</p>
            </div>
            <div className="p-6 flex-1">
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><span className="text-green-500">✔</span> <span className="font-bold text-white">15 Tables Limit</span></li>
                <li className="flex items-center gap-2"><span className="text-green-500">✔</span> Kitchen Display Module</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✔</span> Waiter Notifications</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✔</span> Full Sales Reports</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✔</span> VAT & Service Charge</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✔</span> KRA Tax Computation</li>
              </ul>
            </div>
            <div className="p-6 pt-0">
              <button onClick={() => selectPlan('Regular')} className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-lg font-bold">Choose Regular</button>
            </div>
          </div>

          {/* PLAN 4: PRO */}
          <div className="bg-gradient-to-br from-yellow-600 to-orange-600 rounded-xl border border-yellow-400 flex flex-col shadow-lg shadow-orange-500/20 transform hover:scale-105 transition-all">
            <div className="p-6 border-b border-yellow-500/30">
              <h2 className="text-2xl font-bold text-white">Pro</h2>
              <p className="text-4xl font-extrabold mt-2 text-white">KES 10,000</p>
              <p className="text-yellow-100 text-sm">Per Month</p>
            </div>
            <div className="p-6 flex-1">
              <ul className="space-y-3 text-sm text-white">
                <li className="flex items-center gap-2"><span className="text-lg">🚀</span> <span className="font-bold">Unlimited Tables</span></li>
                <li className="flex items-center gap-2"><span className="text-lg">✅</span> All Modules Included</li>
                <li className="flex items-center gap-2"><span className="text-lg">✅</span> Kitchen & Notifications</li>
                <li className="flex items-center gap-2"><span className="text-lg">✅</span> Advanced Analytics</li>
                <li className="flex items-center gap-2"><span className="text-lg">✅</span> Dynamic Menu Builder</li>
                <li className="flex items-center gap-2"><span className="text-lg">✅</span> Priority Support</li>
              </ul>
            </div>
            <div className="p-6 pt-0">
              <button onClick={() => selectPlan('Pro')} className="w-full bg-white text-orange-600 hover:bg-gray-100 py-3 rounded-lg font-bold">Choose Pro</button>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}