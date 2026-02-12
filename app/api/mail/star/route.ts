import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

type Database = {
  public: {
    Tables: {
      system_mail_stars: {
        Row: { mail_id: string; user_id: string; starred_at: string };
        Insert: { mail_id: string; user_id: string; starred_at?: string };
        Update: { mail_id?: string; user_id?: string; starred_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const getSupabase = (): SupabaseClient<Database> | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient<Database>(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function POST(request: Request) {
  // upsert a star for the user
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const cookieStore = await cookies();
  const userId = cookieStore.get('discord_user_id')?.value ?? null;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const payload = (await request.json()) as { id?: string };
  const id = payload.id;
  if (!id) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  const now = new Date().toISOString();
  const { error } = await supabase.from('system_mail_stars').upsert({ mail_id: id, user_id: userId, starred_at: now }, { onConflict: 'mail_id,user_id' });
  if (error) return NextResponse.json({ error: 'star_failed' }, { status: 500 });
  return NextResponse.json({ status: 'ok' });
}

export async function DELETE(request: Request) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const cookieStore = await cookies();
  const userId = cookieStore.get('discord_user_id')?.value ?? null;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const payload = (await request.json()) as { id?: string };
  const id = payload.id;
  if (!id) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  const { error } = await supabase.from('system_mail_stars').delete().eq('mail_id', id).eq('user_id', userId);
  if (error) return NextResponse.json({ error: 'unstar_failed' }, { status: 500 });
  return NextResponse.json({ status: 'ok' });
}
