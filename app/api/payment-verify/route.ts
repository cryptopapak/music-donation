import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment } from '@/lib/payments/yukassa';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json(
        { success: false, verified: false, error: 'Missing paymentId' },
        { status: 400 }
      );
    }

    // Проверяем статус платежа
    const verified = await verifyPayment(paymentId);

    return NextResponse.json(
      { 
        success: true,
        verified,
        paymentId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { success: false, verified: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
