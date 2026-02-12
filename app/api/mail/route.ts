import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

type Database = {
  public: {
    Tables: {
      system_mails: {
        Row: {
          id: string;
          guild_id: string;
          user_id: string | null;
          title: string;
          body: string;
          category: string;
          status: string;
          created_at: string;
          author_name: string | null;
          author_avatar_url: string | null;
          image_url: string | null;
          details_url: string | null;
        };
        Insert: {
          guild_id: string;
          user_id?: string | null;
          title: string;
          body: string;
          category: string;
          status?: string;
          created_at?: string;
          author_name?: string | null;
          author_avatar_url?: string | null;
          image_url?: string | null;
          details_url?: string | null;
        };
        Update: {
          guild_id?: string;
          user_id?: string | null;
          title?: string;
          body?: string;
          category?: string;
          status?: string;
          created_at?: string;
          author_name?: string | null;
          author_avatar_url?: string | null;
          image_url?: string | null;
          details_url?: string | null;
        };
        Relationships: [];
      };
      system_mail_reads: {
        Row: { mail_id: string; user_id: string; read_at: string | null };
        Insert: { mail_id: string; user_id: string; read_at?: string | null };
        Update: { mail_id?: string; user_id?: string; read_at?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const getSelectedGuildId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || '1465698764453838882';
};

const getSupabase = (): SupabaseClient<Database> | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};


export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('discord_user_id')?.value ?? null;
  const selectedGuildId = await getSelectedGuildId();

  if (!selectedGuildId) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data, error } = await supabase
    .from('system_mails')
    .select('id,title,body,category,status,created_at,user_id,author_name,author_avatar_url,image_url,details_url')
    .eq('guild_id', selectedGuildId)
    .eq('status', 'published')
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .gte('created_at', ninetyDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const mails = data ?? [];
  if (!userId || mails.length === 0) {
    const unescapeHtml = (s: string) =>
      String(s)
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    return NextResponse.json(
      mails.map((item) => ({ ...item, body: typeof item.body === 'string' ? unescapeHtml(item.body) : item.body, is_read: !userId ? true : false }))
    );
  }

  const ids = mails.map((item) => item.id);
  const { data: reads } = await supabase
    .from('system_mail_reads')
    .select('mail_id')
    .eq('user_id', userId)
    .in('mail_id', ids);

  const { data: stars } = await supabase
    .from('system_mail_stars')
    .select('mail_id')
    .eq('user_id', userId)
    .in('mail_id', ids);

  const readSet = new Set(((reads ?? []) as Array<{ mail_id: string }>).map((entry) => entry.mail_id));
  const starSet = new Set(((stars ?? []) as Array<{ mail_id: string }>).map((entry) => entry.mail_id));
  const unescapeHtml = (s: string) =>
    String(s)
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

  const mapped = mails.map((item) => ({
    ...item,
    body: typeof item.body === 'string' ? unescapeHtml(item.body) : item.body,
    is_read: readSet.has(item.id),
    is_starred: starSet.has(item.id),
  }));

  return NextResponse.json(mapped);
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('discord_user_id')?.value ?? null;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const payload = (await request.json()) as { id?: string; ids?: string[] };
  const ids = payload.ids ?? (payload.id ? [payload.id] : []);
  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const upserts = ids.map((mid) => ({ mail_id: mid, user_id: userId, read_at: now }));

  await (supabase.from('system_mail_reads') as unknown as {
    upsert: (values: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }) => Promise<unknown>;
  }).upsert(upserts, { onConflict: 'mail_id,user_id' });

  return NextResponse.json({ status: 'ok' });
}

export async function DELETE(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const selectedGuildId = await getSelectedGuildId();
  if (!selectedGuildId) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const payload = (await request.json()) as { ids?: string[] };
  const ids = payload.ids ?? [];
  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  // Soft-delete mails by setting status to 'deleted' so they no longer appear
  const { error } = await supabase
    .from('system_mails')
    .update({ status: 'deleted' })
    .in('id', ids)
    .eq('guild_id', selectedGuildId);

  if (error) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok' });
}
