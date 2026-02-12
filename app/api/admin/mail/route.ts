import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const getSupabase = (): SupabaseClient<Database> | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const isAdminUser = async () => {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      console.log('mail isAdminUser: No bot token');
      return false;
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;
    const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
    if (!userId || !selectedGuildId) {
      console.log('mail isAdminUser: Missing user ID or guild ID', { userId, selectedGuildId });
      return false;
    }

    // Get admin role from server configuration
    const supabase = getSupabase();
    if (!supabase) {
      console.log('mail isAdminUser: No supabase client');
      return false;
    }

    const { data: server } = await supabase
      .from('servers')
      .select('admin_role_id')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();

    console.log('mail isAdminUser: Server data:', server);

    if (!server?.admin_role_id) {
      console.log('mail isAdminUser: No admin role ID found');
      return false;
    }

    console.log('mail isAdminUser: Admin role ID:', server.admin_role_id);

    // Check Discord API for user roles
    const memberResponse = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    console.log('mail isAdminUser: Member response status:', memberResponse.status);

    if (!memberResponse.ok) {
      console.log('mail isAdminUser: Member response not ok');
      return false;
    }

    const member = (await memberResponse.json()) as { roles: string[] };
    console.log('mail isAdminUser: Member roles:', member.roles);
    const hasRoleResult = member.roles.includes(server.admin_role_id);
    console.log('mail isAdminUser: Has admin role:', hasRoleResult);

    return hasRoleResult;
  } catch (error) {
    console.error('mail isAdminUser: Admin check failed:', error);
    return false;
  }
};

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
      servers: {
        Row: {
          discord_id: string;
          admin_role_id: string;
          // Add other columns as needed
        };
        Insert: {
          discord_id: string;
          admin_role_id: string;
          // Add other columns as needed
        };
        Update: {
          discord_id?: string;
          admin_role_id?: string;
          // Add other columns as needed
        };
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

export async function POST(request: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const selectedGuildId = await getSelectedGuildId();
  if (!selectedGuildId) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  try {
    const payload = await request.json() as {
      userId?: string;
      title: string;
      body: string;
      category: string;
      imageUrl?: string;
      detailsUrl?: string;
    };

    const { userId, title, body, category, imageUrl, detailsUrl } = payload;

    if (!title || !body || !category) {
      return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 });
    }

    // Hedef kullanıcının sunucuda olup olmadığını kontrol et (userId varsa)
    if (userId) {
      const { data: targetMemberData, error: targetMemberError } = await supabase
        .from('guild_members')
        .select('user_id')
        .eq('guild_id', selectedGuildId)
        .eq('user_id', userId)
        .single();

      if (targetMemberError || !targetMemberData) {
        return NextResponse.json({ error: 'user_not_in_server' }, { status: 404 });
      }
    }

    // Mail gönder
    const { data, error } = await supabase
      .from('system_mails')
      .insert({
        guild_id: selectedGuildId,
        user_id: userId || null,
        title,
        body,
        category,
        status: 'published',
        author_name: 'Sistem',
        author_avatar_url: null,
        image_url: imageUrl || null,
        details_url: detailsUrl || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Mail gönderme hatası:', error);
      return NextResponse.json({ error: 'mail_send_failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mailId: data.id,
      message: 'Mail başarıyla gönderildi'
    });

  } catch (error) {
    console.error('Mail gönderme işlemi hatası:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}