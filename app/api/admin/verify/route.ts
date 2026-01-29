import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;

export async function GET() {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken || !ADMIN_ROLE_ID) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;

    if (!userId) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    const memberResponse = await fetch(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
      },
    );

    if (!memberResponse.ok) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    const member = (await memberResponse.json()) as { roles: string[] };
    const isAdmin = member.roles.includes(ADMIN_ROLE_ID);

    return NextResponse.json({ isAdmin }, { status: 200 });
  } catch {
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
}
