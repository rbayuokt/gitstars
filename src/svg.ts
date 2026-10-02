import type { GitHubStats } from './github';
import { escapeXml, formatFull, formatNumber, truncate } from './utils';

export interface Theme {
  background: string;
  border: string;
  title: string;
  text: string;
  muted: string;
  star: string;
}

export const themes: Record<'dark' | 'light', Theme> = {
  dark: {
    background: '#0d1117',
    border: '#30363d',
    title: '#e6edf3',
    text: '#c9d1d9',
    muted: '#8b949e',
    star: '#e3b341',
  },
  light: {
    background: '#ffffff',
    border: '#d0d7de',
    title: '#1f2328',
    text: '#1f2328',
    muted: '#656d76',
    star: '#bf8700',
  },
};

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`;

// No font metrics without a renderer, so estimate a bit wide.
function textWidth(text: string, size: number): number {
  return Math.ceil(Array.from(text).length * size * 0.62);
}

function svg(width: number, height: number, label: string, body: string): string {
  const title = escapeXml(label);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}"><title>${title}</title><g font-family="${FONT}">${body}</g></svg>`;
}

function pill(value: string, theme: Theme, valueColor: string, star: boolean): string {
  const height = 28;
  const pad = 12;
  const label = 'GitStars';
  const valueText = star ? `★ ${value}` : value;
  const dividerX = pad + textWidth(label, 12) + 2;
  const valueX = dividerX + 10;
  const width = valueX + textWidth(valueText, 12) + pad;
  const shownValue = star
    ? `<tspan fill="${theme.star}">★</tspan> ${escapeXml(value)}`
    : escapeXml(value);

  return svg(
    width,
    height,
    `GitStars: ${valueText}`,
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="6" fill="${theme.background}" stroke="${theme.border}"/>` +
      `<text x="${pad}" y="18" font-size="12" font-weight="600" fill="${theme.title}">${label}</text>` +
      `<line x1="${dividerX}" y1="7" x2="${dividerX}" y2="21" stroke="${theme.border}"/>` +
      `<text x="${valueX}" y="18" font-size="12" font-weight="600" fill="${valueColor}">${shownValue}</text>`,
  );
}

export function badgeSvg(stats: GitHubStats, theme: Theme): string {
  return pill(formatNumber(stats.totalStars), theme, theme.text, true);
}

export function errorSvg(message: string, theme: Theme): string {
  return pill(message, theme, theme.muted, false);
}

export function topSvg(stats: GitHubStats, limit: number, theme: Theme): string {
  const width = 420;
  const pad = 24;
  const rowHeight = 24;
  const firstRowY = 166;
  const repos = stats.topRepositories.slice(0, limit);
  const rowCount = Math.max(repos.length, 1);
  const height = firstRowY + (rowCount - 1) * rowHeight + 22;
  const repoLabel = stats.totalRepositories === 1 ? 'repository' : 'repositories';

  const rows = repos.length
    ? repos
        .map((repo, i) => {
          const y = firstRowY + i * rowHeight;
          return (
            `<text x="${pad}" y="${y}" font-size="13" fill="${theme.muted}">${i + 1}.</text>` +
            `<text x="${pad + 24}" y="${y}" font-size="13" fill="${theme.text}">${escapeXml(truncate(repo.name, 32))}</text>` +
            `<text x="${width - pad}" y="${y}" font-size="13" text-anchor="end" fill="${theme.text}"><tspan fill="${theme.star}">★</tspan> ${formatNumber(repo.stargazers_count)}</text>`
          );
        })
        .join('')
    : `<text x="${pad}" y="${firstRowY}" font-size="13" fill="${theme.muted}">No public repositories yet</text>`;

  return svg(
    width,
    height,
    `GitStars: ${stats.username} has ${formatFull(stats.totalStars)} stars`,
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="${theme.background}" stroke="${theme.border}"/>` +
      `<text x="${pad}" y="34" font-size="15" font-weight="600" fill="${theme.title}">GitStars</text>` +
      `<text x="${pad}" y="62" font-size="14" font-weight="600" fill="${theme.title}">@${escapeXml(stats.username)}</text>` +
      `<text x="${pad}" y="86" font-size="13" fill="${theme.text}"><tspan fill="${theme.star}">★</tspan> ${formatFull(stats.totalStars)} total stars</text>` +
      `<text x="${pad}" y="106" font-size="13" fill="${theme.muted}">${formatFull(stats.totalRepositories)} ${repoLabel}</text>` +
      `<line x1="${pad}" y1="122" x2="${width - pad}" y2="122" stroke="${theme.border}"/>` +
      `<text x="${pad}" y="142" font-size="12" font-weight="600" fill="${theme.muted}">Top repositories</text>` +
      rows,
  );
}
