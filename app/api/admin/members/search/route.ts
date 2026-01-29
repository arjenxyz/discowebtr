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

const toAvatarUrl = (userId: string, avatar: string | null) => {
  if (avatar) {
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png?size=128`;
  }
  return `https://cdn.discordapp.com/embed/avatars/${Number(userId) % 5}.png`;
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
  const query = (searchParams.get('q') ?? '').trim();
  const limit = Math.min(Number(searchParams.get('limit') ?? 8), 20);

  if (!query) {
    return NextResponse.json([]);
  }

  const results: Array<{
    id: string;
    username: string;
    nickname: string | null;
    displayName: string | null;
    avatarUrl: string;
  }> = [];

  const seen = new Set<string>();

  const pushMember = (member: { user: { id: string; username: string; avatar: string | null; global_name?: string | null }; nick?: string | null }) => {
    if (seen.has(member.user.id)) {
      return;
    }
    seen.add(member.user.id);
    results.push({
      id: member.user.id,
      username: member.user.username,
      nickname: member.nick ?? null,
      displayName: member.user.global_name ?? null,
      avatarUrl: toAvatarUrl(member.user.id, member.user.avatar),
    });
  };

  if (/^\d{6,20}$/.test(query)) {
    const directResponse = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${query}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (directResponse.ok) {
      const member = (await directResponse.json()) as {
        nick?: string | null;
        user: { id: string; username: string; avatar: string | null; global_name?: string | null };
      };
      pushMember(member);
    }
  }

  if (query.length >= 2 && results.length < limit) {
    const searchUrl = new URL(`https://discord.com/api/guilds/${GUILD_ID}/members/search`);
    searchUrl.searchParams.set('query', query);
    searchUrl.searchParams.set('limit', String(limit));

    const searchResponse = await fetch(searchUrl.toString(), {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (searchResponse.ok) {
      const members = (await searchResponse.json()) as Array<{
        nick?: string | null;
        user: { id: string; username: string; avatar: string | null; global_name?: string | null };
      }>;
      members.forEach(pushMember);
    }
  }

  return NextResponse.json(results.slice(0, limit));
}
