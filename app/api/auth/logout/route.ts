import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ status: 'ok' });
  response.cookies.set('discord_user_id', '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
