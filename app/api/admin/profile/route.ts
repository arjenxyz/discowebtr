import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';

// Seçilen sunucu ID'sini al
const getSelectedGuildId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || GUILD_ID; // Varsayılan olarak config'deki guild ID
};

export async function GET() {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'missing_bot_token' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const selectedGuildId = await getSelectedGuildId();

    const [memberResponse, guildResponse] = await Promise.all([
      fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`, {
        headers: { Authorization: `Bot ${botToken}` },
      }),
      fetch(`https://discord.com/api/guilds/${selectedGuildId}`, {
        headers: { Authorization: `Bot ${botToken}` },
      }),
    ]);

    if (!memberResponse.ok || !guildResponse.ok) {
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
    }

    const member = (await memberResponse.json()) as {
      nick?: string;
      user: { id: string; username: string; avatar: string | null };
    };
    const guild = (await guildResponse.json()) as { name: string; icon: string | null; id: string };

    const avatarHash = member.user.avatar;
    const avatarUrl = avatarHash
      ? `https://cdn.discordapp.com/avatars/${member.user.id}/${avatarHash}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${Number(member.user.id) % 5}.png`;

    const guildIcon = guild.icon
      ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`
      : null;

    return NextResponse.json({
      username: member.user.username,
      nickname: member.nick ?? null,
      avatarUrl,
      guildName: guild.name,
      guildIcon,
    });
  } catch {
    return NextResponse.json({ error: 'unhandled_exception' }, { status: 500 });
  }
}
