 'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function ApprovalsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Initialize Supabase client
  const supabase = createClient();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    // Assuming you have an 'approvals' or 'void_requests' table
    const { data, error } = await supabase
      .from('approvals') 
      .select('*')
      .eq('status', 'pending');

    if (error) {
      // If table doesn't exist, just show empty list instead of crashing
      if (error.code === '42P01') { 
        setRequests([]); 
      } else {
        toast.error('Failed to load approvals');
        console.error(error);
      }
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    // Add your approval logic here
    toast.success('Request Approved');
    fetchRequests();
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl font-bold text-orange-400 mb-6">Pending Approvals</h1>

      {loading ? (
        <p>Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-gray-400">No pending approvals.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-gray-800 p-4 rounded flex justify-between items-center">
              <div>
                <p className="font-bold">{req.type || 'Request'}</p>
                <p className="text-sm text-gray-400">{req.details || 'No details'}</p>
              </div>
              <button 
                onClick={() => handleApprove(req.id)}
                className="bg-green-600 px-4 py-2 rounded font-bold"
              >
                Approve
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}