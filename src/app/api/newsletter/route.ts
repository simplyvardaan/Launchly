import { NextResponse } from 'next/server';
import { addSubscriber, getSubscribersCount } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { parseNewsletterTopics } from '@/lib/newsletterTopics';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`newsletter:${ip}`, 6, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, message: 'Too many subscription attempts. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: 'A subscription object is required.' }, { status: 400 });
    }
    if (typeof body?.website === 'string' && body.website.trim()) {
      return NextResponse.json({ success: true, message: 'Subscription received.' });
    }
    const { email, source } = body;

    if (!email || typeof email !== 'string' || email.length > 254) {
      return NextResponse.json(
        { success: false, message: 'Email address is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanSource = typeof source === 'string' ? source.slice(0, 50) : 'frontpage';
    const parsedTopics = parseNewsletterTopics(body.topics);
    if (parsedTopics.error) {
      return NextResponse.json({ success: false, message: parsedTopics.error }, { status: 400 });
    }

    const result = await addSubscriber(cleanEmail, cleanSource, parsedTopics.topics);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    const total = await getSubscribersCount();
    return NextResponse.json({
      ...result,
      totalSubscribers: total,
      subscribedAt: result.subscriber?.createdAt,
      topics: result.subscriber?.topics ?? [],
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to process subscription. Please try again.' },
      { status: 500 }
    );
  }
}
