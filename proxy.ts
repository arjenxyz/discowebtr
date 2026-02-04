import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cache için basit bir map (production'da Redis kullan)
const roleCheckCache = new Map<string, { roles: string[]; expires: number }>();
const CACHE_DURATION = 30 * 1000; // 30 saniye (test için)
const DEFAULT_DEVELOPER_GUILD_ID = '1465698764453838882';
const DEFAULT_DEVELOPER_ROLE_ID = '1467580199481639013';

async function checkUserRoles(userId: string, guildId: string): Promise<string[] | null> {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      console.error('Middleware: No bot token available');
      return null;
    }

    // Cache kontrolü
    const cacheKey = `${userId}-${guildId}`;
    const cached = roleCheckCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.roles;
    }

    // Discord API'den üyenin rollerini al
    const memberResponse = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!memberResponse.ok) {
      console.error(`Middleware: Failed to fetch member roles: ${memberResponse.status}`);
      return null;
    }

    const member = (await memberResponse.json()) as { roles: string[] };

    // Cache'e kaydet
    roleCheckCache.set(cacheKey, {
      roles: member.roles,
      expires: Date.now() + CACHE_DURATION
    });

    return member.roles;
  } catch (error) {
    console.error('Middleware: Error checking user roles:', error);
    return null;
  }
}

async function getServerAdminRole(guildId: string): Promise<string | null> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.warn('Middleware: Supabase credentials not available, skipping role check');
      return null;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Sunucunun admin rolünü veritabanından al
    const { data: server } = await supabase
      .from('servers')
      .select('admin_role_id')
      .eq('discord_id', guildId)
      .maybeSingle();

    console.log('Middleware: Server data from DB:', server);

    if (!server?.admin_role_id) {
      console.log('Middleware: No admin role ID configured for server');
      return null;
    }

    console.log('Middleware: Admin role ID found:', server.admin_role_id);
    return server.admin_role_id;

  } catch (error) {
    console.error('Middleware: Error in getServerAdminRole:', error);
    return null;
  }
}

async function isDeveloper(userId: string): Promise<boolean> {
	const roleId = process.env.DEVELOPER_ROLE_ID ?? DEFAULT_DEVELOPER_ROLE_ID;
	const guildId = process.env.DEVELOPER_GUILD_ID ?? process.env.DISCORD_GUILD_ID ?? DEFAULT_DEVELOPER_GUILD_ID;

	if (!roleId || !guildId) {
		return false;
	}

	const roles = await checkUserRoles(userId, guildId);
	if (!roles) {
		return false;
	}

	return roles.includes(roleId);
}

const IGNORED_PREFIXES = ['/api', '/_next'];
const IGNORED_PATHS = ['/favicon.ico', '/robots.txt', '/sitemap.xml'];

export async function proxy(request: NextRequest) {
	const { pathname, origin } = request.nextUrl;

	// Static dosyaları ve API'leri atla
	if (IGNORED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || IGNORED_PATHS.includes(pathname)) {
		return NextResponse.next();
	}

	// Maintenance kontrolü
	try {
		const response = await fetch(new URL('/api/maintenance', origin), { cache: 'no-store' });
		if (response.ok) {
			const data = (await response.json()) as { flags?: Record<string, { is_active?: boolean }> };
			if (data?.flags?.site?.is_active) {
				try {
					const cookieStore = await (await import('next/headers')).cookies();
					const userId = cookieStore.get('discord_user_id')?.value;

					if (userId) {
						const developer = await isDeveloper(userId);
						if (developer) {
							return NextResponse.next();
						}
					}
				} catch {
					// Developer kontrolü başarısız olursa normal bakım yönlendirmesi uygulanır
				}

				return NextResponse.redirect(new URL('/maintenance', request.url));
			}
		}
	} catch {
		// Maintenance kontrolü başarısız olursa devam et
	}

	// Ana sayfa ve public sayfaları atla
	if (pathname === '/' || pathname.startsWith('/maintenance') || pathname.startsWith('/server-left')) {
		return NextResponse.next();
	}

	// Auth callback ve error sayfalarını atla
	if (pathname.includes('/auth/')) {
		return NextResponse.next();
	}

	// Developer sayfaları için üyelik kontrolünü atla (yetki kontrolü sayfa içinde yapılır)
	if (pathname.startsWith('/developer')) {
		return NextResponse.next();
	}

	// Kullanıcının giriş yapmış olup olmadığını ve sunucuda üye olup olmadığını kontrol et
	try {
		const cookieStore = await (await import('next/headers')).cookies();
		const userId = cookieStore.get('discord_user_id')?.value;
		const selectedGuildId = cookieStore.get('selected_guild_id')?.value;

		if (userId && selectedGuildId) {
			console.log('🔍 Middleware: Checking server membership for user:', userId, 'guild:', selectedGuildId);

			// Kullanıcının sunucuda üye olup olmadığını kontrol et
			const userRoles = await checkUserRoles(userId, selectedGuildId);

			if (userRoles === null) {
				console.log('🚪 Middleware: User is not a member of the selected server, redirecting to /server-left');
				// Kullanıcı sunucudan ayrılmış, server-left sayfasına yönlendir
				return NextResponse.redirect(new URL('/server-left', request.url));
			}

			console.log('✅ Middleware: User is a member of the server');
		}
	} catch (error) {
		console.error('🔍 Middleware: Error checking server membership:', error);
		// Hata durumunda devam et (fail-safe)
	}

	// Admin sayfaları için rol kontrolü
	if (pathname.startsWith('/admin')) {
		console.log('🔐 Middleware: Admin page access detected:', pathname);
		try {
			// Cookie'lerden gerekli bilgileri al
			const cookieStore = await (await import('next/headers')).cookies();
			const userId = cookieStore.get('discord_user_id')?.value;
			const selectedGuildId = cookieStore.get('selected_guild_id')?.value;

			console.log('🔐 Middleware: Cookies - userId:', userId, 'guildId:', selectedGuildId);

			if (!userId || !selectedGuildId) {
				console.log('🔐 Middleware: Missing user or guild ID, redirecting to home');
				// Session yok, ana sayfaya yönlendir
				return NextResponse.redirect(new URL('/', request.url));
			}

			// Kullanıcının rollerini kontrol et
			const userRoles = await checkUserRoles(userId, selectedGuildId);
			console.log('🔐 Middleware: User roles fetched:', userRoles);

			if (!userRoles) {
				console.log('🔐 Middleware: Could not fetch user roles, forcing logout');
				// Roller alınamadı, çıkış yap
				const response = NextResponse.redirect(new URL('/', request.url));
				response.cookies.set('discord_user_id', '', { maxAge: 0, path: '/' });
				return response;
			}

			// Sunucunun admin rolünü al
			const adminRoleId = await getServerAdminRole(selectedGuildId);
			console.log('🔐 Middleware: Admin role ID for server:', adminRoleId);

			if (!adminRoleId) {
				console.log('🔐 Middleware: No admin role configured for server, allowing access');
				// Admin rolü ayarlanmamış, erişime izin ver
				return NextResponse.next();
			}

			// Kullanıcı admin rolüne sahip mi kontrol et
			const hasAdminRole = userRoles.includes(adminRoleId);
			console.log('🔐 Middleware: User has admin role:', hasAdminRole, 'Role ID:', adminRoleId, 'User roles:', userRoles);

			if (!hasAdminRole) {
				console.log(`🔐 Middleware: User ${userId} no longer has admin role ${adminRoleId}, forcing logout`);

				// Admin rolü yok, çıkış yap ve cache'i temizle
				roleCheckCache.delete(`${userId}-${selectedGuildId}`);

				const response = NextResponse.redirect(new URL('/', request.url));
				response.cookies.set('discord_user_id', '', { maxAge: 0, path: '/' });
				response.cookies.set('selected_guild_id', '', { maxAge: 0, path: '/' });

				return response;
			}

			console.log('🔐 Middleware: Access granted for admin page');
		} catch (error) {
			console.error('🔐 Middleware: Unexpected error:', error);
			// Hata durumunda güvenli tarafta kal, çıkış yap
			const response = NextResponse.redirect(new URL('/', request.url));
			response.cookies.set('discord_user_id', '', { maxAge: 0, path: '/' });
			return response;
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
