import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('discord_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Kullanıcının sunucularını al
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'failed_to_fetch_guilds' }, { status: response.status });
    }

    const guilds = await response.json();

    // Sadece botun bulunduğu sunucuları filtrele
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ guilds: [] });
    }

    const filteredGuilds = [];
    for (const guild of guilds) {
      try {
        const botResponse = await fetch(`https://discord.com/api/guilds/${guild.id}`, {
          headers: { Authorization: `Bot ${botToken}` },
        });
        if (botResponse.ok) {
          filteredGuilds.push(guild);
        }
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ guilds: filteredGuilds });
  } catch (error) {
    console.error('Error fetching guilds:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}