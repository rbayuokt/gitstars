import { fetchStats, GitHubError, type GitHubErrorKind, type GitHubStats } from './github';
import { badgeSvg, errorSvg, themes, topSvg, type Theme } from './svg';
import { isValidUsername, parseLimit } from './utils';

interface Env {
  GITHUB_TOKEN?: string;
}

const CACHE_SECONDS = 3600;
const ERROR_CACHE_SECONDS = 300;

const USAGE = `GitStars
Free dynamic GitHub star badges.

Usage:
/username
/username/top
/username/top?limit=5
/username?theme=light
`;

const ERRORS: Record<GitHubErrorKind, { status: number; message: string }> = {
  not_found: { status: 404, message: 'user not found' },
  rate_limited: { status: 429, message: 'rate limited' },
  unavailable: { status: 502, message: 'GitHub API error' },
};

function svgResponse(body: string, status = 200, maxAge = CACHE_SECONDS): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': `public, max-age=${maxAge}`,
    },
  });
}

// Stats are cached per user, so the badge and every /top variant share one GitHub lookup.
// Cache API is a no-op on *.workers.dev; it kicks in once the Worker runs on a custom domain.
async function getStats(username: string, env: Env, ctx: ExecutionContext): Promise<GitHubStats> {
  const cache = caches.default;
  const key = new Request(`https://gitstars.cache/stats/${username.toLowerCase()}`);

  const hit = await cache.match(key);
  if (hit) return { ...(await hit.json<GitHubStats>()), username };

  const stats = await fetchStats(username, env.GITHUB_TOKEN);
  ctx.waitUntil(
    cache.put(key, Response.json(stats, { headers: { 'Cache-Control': `max-age=${CACHE_SECONDS}` } })),
  );
  return stats;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);

    if (parts.length === 0) {
      return new Response(USAGE, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': `public, max-age=${CACHE_SECONDS}` },
      });
    }

    const theme: Theme = url.searchParams.get('theme') === 'light' ? themes.light : themes.dark;
    const [username, route] = parts;
    const isTop = route === 'top';

    if (parts.length > 2 || (route !== undefined && !isTop)) {
      return svgResponse(errorSvg('not found', theme), 404, ERROR_CACHE_SECONDS);
    }
    if (!isValidUsername(username)) {
      return svgResponse(errorSvg('invalid username', theme), 400, ERROR_CACHE_SECONDS);
    }

    try {
      const stats = await getStats(username, env, ctx);
      return svgResponse(
        isTop ? topSvg(stats, parseLimit(url.searchParams.get('limit')), theme) : badgeSvg(stats, theme),
      );
    } catch (err) {
      const { status, message } = ERRORS[err instanceof GitHubError ? err.kind : 'unavailable'];
      return svgResponse(errorSvg(message, theme), status, ERROR_CACHE_SECONDS);
    }
  },
} satisfies ExportedHandler<Env>;
