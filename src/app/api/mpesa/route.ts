 import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Check Keys
    if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_CONSUMER_SECRET) {
      return NextResponse.json({ success: false, message: "M-Pesa keys missing in .env.local" }, { status: 500 });
    }

    const body = await request.json();
    const { phone, amount } = body;

    // 2. Mock Success for Sandbox (To prevent crash if keys are invalid)
    // REMOVE THIS BLOCK IN PRODUCTION
    if (process.env.MPESA_ENVIRONMENT === 'sandbox') {
       // Simulate delay
       await new Promise(resolve => setTimeout(resolve, 1000));
       return NextResponse.json({ success: true, message: "Sandbox Mode: Simulated Success" });
    }
    
    // 3. Real Logic would go here
    // For now, return error if not sandbox
    return NextResponse.json({ success: false, message: "Production mode not configured" }, { status: 400 });

  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}