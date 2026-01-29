import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('discord_user_id')?.value;

  const { data, error } = await supabase
    .from('notifications')
    .select('id,title,body,type,created_at,author_name,author_avatar_url,details_url,image_url')
    .eq('status', 'published')
    .or(userId ? `target_user_id.is.null,target_user_id.eq.${userId}` : 'target_user_id.is.null')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const notifications = data ?? [];
  if (!userId || notifications.length === 0) {
    return NextResponse.json(notifications.map((item) => ({ ...item, is_read: !userId ? true : false })));
  }

  const ids = notifications.map((item) => item.id);
  const { data: reads } = await supabase
    .from('notification_reads')
    .select('notification_id')
    .eq('user_id', userId)
    .in('notification_id', ids);

  const readSet = new Set((reads ?? []).map((entry) => entry.notification_id));
  const mapped = notifications.map((item) => ({ ...item, is_read: readSet.has(item.id) }));

  return NextResponse.json(mapped);
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('discord_user_id')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const payload = (await request.json()) as { id?: string };
  if (!payload.id) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  await (supabase.from('notification_reads') as unknown as {
    upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => Promise<unknown>;
  }).upsert(
    {
      notification_id: payload.id,
      user_id: userId,
      read_at: new Date().toISOString(),
    },
    { onConflict: 'notification_id,user_id' },
  );

  return NextResponse.json({ status: 'ok' });
}
