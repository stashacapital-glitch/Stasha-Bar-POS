 import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase Client for Server-Side usage
// Ensure your .env.local or Vercel Env Vars have these set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, role, full_name } = body;

    // 1. Create user in Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. Create profile in 'users' table (if you have one)
    if (user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert([{ id: user.id, email, role, full_name }]);

      if (profileError) {
        // Even if profile fails, user is created in auth, handle appropriately
        console.error('Profile creation error:', profileError);
      }
    }

    return NextResponse.json({ message: 'User created successfully', user }, { status: 200 });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}