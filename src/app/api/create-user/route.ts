import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(request: Request) {
  const { email, pin, role, fullName } = await request.json();

  if (!email || !pin || !role || !fullName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // 1. Create Auth User
  const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: pin,
    email_confirm: true,
    user_metadata: { role: role, full_name: fullName }
  });

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 400 });
  }

  // 2. Update Profile (Approval handled by trigger default, but we force false for waiters)
  // The trigger creates the profile, we just update it to ensure consistency
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
        full_name: fullName,
        role: role,
        approved: false // Needs Owner approval
    })
    .eq('id', user.user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: 'Staff created. Pending Approval.' });
}