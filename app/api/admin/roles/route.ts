import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;

const isAdminUser = async () => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken || !ADMIN_ROLE_ID) {
    return false;
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('discord_user_id')?.value;
  if (!userId) {
    return false;
  }

  const memberResponse = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!memberResponse.ok) {
    return false;
  }

  const member = (await memberResponse.json()) as { roles: string[] };
  return member.roles.includes(ADMIN_ROLE_ID);
};

export async function GET(request: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'missing_bot_token' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('query') ?? '').trim().toLowerCase();
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);

  const response = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const roles = (await response.json()) as Array<{
    id: string;
    name: string;
    color: number;
    position: number;
    managed?: boolean;
  }>;

  const filtered = roles
    .filter((role) => !role.managed)
    .sort((a, b) => b.position - a.position)
    .filter((role) => (query ? role.name.toLowerCase().includes(query) || role.id.includes(query) : true))
    .slice(0, limit)
    .map((role) => ({
      id: role.id,
      name: role.name,
      color: role.color,
    }));

  return NextResponse.json(filtered);
}
