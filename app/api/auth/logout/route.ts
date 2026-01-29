import { NextResponse, type NextRequest } from 'next/server';

// Çıkış işlemini yapan ana fonksiyon
function handleLogout(request: NextRequest) {
  // 1. Kullanıcıyı ana sayfaya yönlendir
  const response = NextResponse.redirect(new URL('/', request.url));

  // 2. Cookie'yi sil
  response.cookies.set('discord_user_id', '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0, // Hemen sil
    path: '/',
  });

  return response;
}

// POST isteği (Normal buton tıklaması)
export async function POST(request: NextRequest) {
  return handleLogout(request);
}

// GET isteği (Yönlendirme hatası veya elle giriş olursa burası devreye girer ve 405'i engeller)
export async function GET(request: NextRequest) {
  return handleLogout(request);
}