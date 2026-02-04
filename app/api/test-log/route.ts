// Test endpoint for logging
import { logWebEvent } from '@/lib/serverLogger';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    await logWebEvent(request, {
      event: 'test_wallet_adjust',
      status: 'success',
      userId: '1163500308270436442',
      guildId: '1467155388024754260',
      metadata: {
        scope: 'user',
        targetUserId: '1163500308270436442',
        mode: 'add',
        amount: 100,
        message: 'Test log from API',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Test log error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}