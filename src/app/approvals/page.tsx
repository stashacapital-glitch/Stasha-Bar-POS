"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function ApprovalsPage() {
  const { user, role } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<any[]>([]);

  useEffect(() => {
    if (role && role !== 'owner') router.push('/'); // Secure route
    if (role === 'owner') fetchPending();
  }, [role]);

  const fetchPending = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('approved', false);
    if (data) setPending(data);
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from('profiles').update({ approved: true }).eq('id', id);
    if (!error) {
      toast.success("User Approved!");
      fetchPending();
    }
  };

  const handleReject = async (id: string) => {
    await supabase.from('profiles').delete().eq('id', id);
    toast.success("User Rejected.");
    fetchPending();
  };

  if (role !== 'owner') return null;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between mb-6">
            <h1 className="text-2xl font-bold">Pending Approvals</h1>
            <button onClick={() => router.push('/admin')} className="text-blue-600 text-sm font-bold">← Back to Admin</button>
        </div>

        {pending.length === 0 ? (
          <div className="bg-white p-6 rounded-xl text-center text-gray-400">No pending requests</div>
        ) : (
          <div className="space-y-4">
            {pending.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-xl shadow flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg">{p.full_name}</h3>
                    <p className="text-gray-500 text-sm">{p.email} • <span className="capitalize">{p.role}</span></p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleReject(p.id)} className="bg-red-100 text-red-600 px-4 py-2 rounded font-bold text-sm">Reject</button>
                    <button onClick={() => handleApprove(p.id)} className="bg-green-600 text-white px-4 py-2 rounded font-bold text-sm">Approve</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}