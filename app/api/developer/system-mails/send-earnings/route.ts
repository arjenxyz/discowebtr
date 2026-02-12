import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logWebEvent } from '@/lib/serverLogger';

const DEFAULT_DEVELOPER_GUILD_ID = '1465698764453838882';
const DEFAULT_DEVELOPER_ROLE_ID = '1467580199481639013';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const checkDeveloperAccess = async (request: NextRequest): Promise<boolean> => {
  try {
    const cookies = request.cookies;
    const discordUserId = cookies.get('discord_user_id')?.value;

    if (!discordUserId) return false;

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) return false;

    const developerRoleId = process.env.DEVELOPER_ROLE_ID ?? DEFAULT_DEVELOPER_ROLE_ID;
    const developerGuildId = process.env.DEVELOPER_GUILD_ID ?? DEFAULT_DEVELOPER_GUILD_ID;

    const developerResponse = await fetch(
      `https://discord.com/api/guilds/${developerGuildId}/members/${discordUserId}`,
      { headers: { Authorization: `Bot ${botToken}` } },
    );

    if (!developerResponse.ok) return false;
    const developerMember = (await developerResponse.json()) as { roles: string[] };
    return developerMember.roles.includes(developerRoleId);
  } catch {
    return false;
  }
};

export async function POST(request: NextRequest) {
  if (!(await checkDeveloperAccess(request))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const payload = (await request.json()) as {
    effectiveDate?: string;
    changeSummaryDetailed?: string;
    reasonShort?: string;
    targetAudience?: string;
    impactEstimate?: string;
    supportLink?: string;
    title?: string;
    guildId?: string | null;
  };

  const effectiveDate = payload.effectiveDate ?? new Date().toISOString().split('T')[0];
  const title = payload.title ?? 'Kazanç Ayarları Güncellendi';

  const escapeHtml = (str: string | undefined | null) =>
    (str ?? '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Build simplified semantic HTML (no boxed layouts)
  const summary = String(payload.changeSummaryDetailed || '').trim();
  const summaryLines = summary ? summary.split(/\r?\n/).map(l => l.trim()).filter(Boolean) : [];

  const buildListHtml = (lines: string[]) => {
    if (!lines.length) return '';
    return `<ul>${lines.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`;
  };

  const metaParts: string[] = [];
  metaParts.push(`Tarih: ${escapeHtml(effectiveDate)}`);
  if (payload.reasonShort) metaParts.push(`Güncelleme Nedeni: ${escapeHtml(payload.reasonShort)}`);
  if (payload.targetAudience) metaParts.push(`Etkilenen Kullanıcılar: ${escapeHtml(payload.targetAudience)}`);
  if (payload.impactEstimate) metaParts.push(`Beklenen Etki: ${escapeHtml(payload.impactEstimate)}`);

  const finalBodyHtml = `
    <div>
      <h4>📈 ${escapeHtml(title)}</h4>
      <p>Economy settings updated by management.</p>

      ${metaParts.length ? `<p>${metaParts.map(escapeHtml).join(' · ')}</p>` : ''}

      ${summaryLines.length ? `<h5>Değişiklikler</h5>${buildListHtml(summaryLines)}` : ''}

      ${payload.supportLink ? `<p>Detaylı bilgi: <a href="${escapeHtml(payload.supportLink)}">${escapeHtml(payload.supportLink)}</a></p>` : ''}

      <p style="color:#6b7280;font-size:13px">İşlem Tarihi: ${escapeHtml(new Date().toISOString())}</p>
    </div>
  `;

  const cookies = request.cookies;
  const discordUserId = cookies.get('discord_user_id')?.value;
  const selectedGuildId = payload.guildId ?? cookies.get('selected_guild_id')?.value ?? DEFAULT_DEVELOPER_GUILD_ID;

  const { error } = await supabase.from('system_mails').insert({
    guild_id: selectedGuildId,
    user_id: null,
    title,
    body: finalBodyHtml,
    category: 'system',
    status: 'published',
    created_by: discordUserId,
    author_name: discordUserId ?? 'System',
    author_avatar_url: null,
    image_url: null,
    details_url: null,
  });

  if (error) {
    console.error('send-earnings POST save_failed:', error);
    return NextResponse.json({ error: 'save_failed', detail: error.message, code: error.code }, { status: 500 });
  }

  await logWebEvent(request, {
    event: 'developer_system_mail_create_earnings',
    status: 'success',
    userId: discordUserId ?? undefined,
    guildId: selectedGuildId,
    metadata: { title, effectiveDate },
  });

  return NextResponse.json({ status: 'ok' });
}