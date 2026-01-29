import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const IGNORED_PREFIXES = ['/maintenance', '/admin', '/api', '/_next'];
const IGNORED_PATHS = ['/favicon.ico', '/robots.txt', '/sitemap.xml'];

export async function proxy(request: NextRequest) {
	const { pathname, origin } = request.nextUrl;

	if (IGNORED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || IGNORED_PATHS.includes(pathname)) {
		return NextResponse.next();
	}

	try {
		const response = await fetch(new URL('/api/maintenance', origin), { cache: 'no-store' });
		if (!response.ok) {
			return NextResponse.next();
		}

		const data = (await response.json()) as { flags?: Record<string, { is_active?: boolean }> };
		if (data?.flags?.site?.is_active) {
			return NextResponse.redirect(new URL('/maintenance', request.url));
		}
	} catch {
		return NextResponse.next();
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
