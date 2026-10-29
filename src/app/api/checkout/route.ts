import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan = 'pro', billing = 'monthly', templateId, couponCode } = body;

    const price = plan === 'pro' 
      ? (billing === 'yearly' ? 159 : 19)
      : (templateId ? 49 : 0);

    const PROMO_CODES: Record<string, number> = {
      LAUNCH2026: 25,
      EARLYBIRD: 20,
      COMMUNITY: 15,
    };

    const cleanCoupon = typeof couponCode === 'string' ? couponCode.trim().toUpperCase() : undefined;
    const discountPercent = cleanCoupon && PROMO_CODES[cleanCoupon] ? PROMO_CODES[cleanCoupon] : 0;
    const discountAmount = discountPercent > 0 ? Number(((price * discountPercent) / 100).toFixed(2)) : 0;
    const finalAmount = Math.max(0, Number((price - discountAmount).toFixed(2)));

    // Simulate instant secure checkout session creation
    const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return NextResponse.json({
      success: true,
      sessionId,
      plan,
      billing,
      originalAmount: price,
      discountAmount,
      discountPercent,
      appliedCoupon: discountPercent > 0 ? cleanCoupon : null,
      amount: finalAmount,
      currency: 'USD',
      templateId,
      checkoutUrl: `/checkout?plan=${plan}&billing=${billing}&session_id=${sessionId}`,
      message: `Please scan the official QR code to complete payment for Launchly ${plan.toUpperCase()} (${billing}).`,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to initiate checkout.' },
      { status: 500 }
    );
  }
}
