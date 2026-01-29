import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminShell from './AdminShell';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;

const getIsAdmin = async () => {
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
    cache: 'no-store',
  });

  if (!memberResponse.ok) {
    return false;
  }

  const member = (await memberResponse.json()) as { roles: string[] };
  return member.roles.includes(ADMIN_ROLE_ID);
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) {
    redirect('/dashboard');
  }

  return <AdminShell>{children}</AdminShell>;
}