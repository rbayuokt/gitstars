export interface GitHubRepository {
  name: string;
  stargazers_count: number;
  fork: boolean;
}

export interface GitHubStats {
  username: string;
  totalStars: number;
  totalRepositories: number;
  topRepositories: GitHubRepository[];
}

export type GitHubErrorKind = 'not_found' | 'rate_limited' | 'unavailable';

export class GitHubError extends Error {
  constructor(readonly kind: GitHubErrorKind) {
    super(kind);
  }
}

const PER_PAGE = 100;
// ponytail: free plan allows 50 subrequests per request, so accounts with more
// than 4,500 repos are counted partially. Raise this on the paid plan.
const MAX_PAGES = 45;

function isRepository(value: unknown): value is GitHubRepository {
  if (typeof value !== 'object' || value === null) return false;
  const repo = value as Record<string, unknown>;
  return (
    typeof repo.name === 'string' &&
    typeof repo.stargazers_count === 'number' &&
    typeof repo.fork === 'boolean'
  );
}

async function fetchPage(username: string, page: number, token?: string): Promise<GitHubRepository[]> {
  const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?type=owner&per_page=${PER_PAGE}&page=${page}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'GitStars',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch {
    throw new GitHubError('unavailable');
  }

  if (res.status === 404) throw new GitHubError('not_found');
  if (res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0')) {
    throw new GitHubError('rate_limited');
  }
  if (!res.ok) throw new GitHubError('unavailable');

  const body: unknown = await res.json().catch(() => null);
  if (!Array.isArray(body)) throw new GitHubError('unavailable');
  return body.filter(isRepository);
}

export async function fetchStats(username: string, token?: string): Promise<GitHubStats> {
  const repos: GitHubRepository[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await fetchPage(username, page, token);
    repos.push(...batch);
    if (batch.length < PER_PAGE) break;
  }

  const owned = repos
    .filter((repo) => !repo.fork)
    .map(({ name, stargazers_count, fork }) => ({ name, stargazers_count, fork }));

  return {
    username,
    totalStars: owned.reduce((sum, repo) => sum + repo.stargazers_count, 0),
    totalRepositories: owned.length,
    topRepositories: owned.sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 10),
  };
}
