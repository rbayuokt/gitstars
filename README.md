# GitStars

Show your GitHub stars in one badge.

GitStars is a free dynamic GitHub README badge that calculates the total number of stars
across your public, non-fork repositories and displays your most-starred projects.

It's a single Cloudflare Worker. A README requests an image URL, the Worker asks the
GitHub REST API for the user's repositories, adds up the stars and answers with an SVG.
There's no database and no frontend.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/rbayuokt/gitstars)

## Deploy your own

GitStars is meant to be self-hosted. Everyone runs their own copy on their own Cloudflare
account with their own GitHub token, so one busy instance can't burn through a shared
GitHub rate limit, and the Workers free plan covers personal use.

The button above copies this repository to your GitHub account, deploys it as a Worker and
sets up builds so every push redeploys. During setup it asks for `GITHUB_TOKEN`; see
[Optional GitHub token](#optional-github-token) for what to paste there.

When it finishes, your badge lives at `https://gitstars.<your-subdomain>.workers.dev`.
Use that URL in place of `YOUR-WORKER.workers.dev` below.

To deploy from your machine instead, see [Deployment](#deployment).

## Usage

```md
![GitStars](https://YOUR-WORKER.workers.dev/torvalds)
```

Renders a compact badge: `GitStars | ★ 14.9k`.

### Top repositories

```md
![GitStars Top Repositories](https://YOUR-WORKER.workers.dev/torvalds/top)
```

A card with the username, total stars, the number of repositories counted and the top 10
repositories by stars. The card height follows the number of rows shown, and long
repository names are cut off with `…`.

### Limit

```md
![GitStars](https://YOUR-WORKER.workers.dev/torvalds/top?limit=5)
```

`limit` accepts 1 to 10. Values above 10 become 10, values below 1 become 1, and anything
that isn't a number falls back to 10.

### Themes

```md
![GitStars](https://YOUR-WORKER.workers.dev/torvalds?theme=light)
```

```md
![GitStars](https://YOUR-WORKER.workers.dev/torvalds/top?theme=dark)
```

`dark` is the default and follows GitHub's dark palette. Any value other than `light`
falls back to `dark`.

To follow the viewer's GitHub theme, use `<picture>`:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://YOUR-WORKER.workers.dev/torvalds?theme=dark" />
  <img src="https://YOUR-WORKER.workers.dev/torvalds?theme=light" alt="GitStars" />
</picture>
```

Swap the two `theme` values for the opposite, a light badge on dark mode and a dark badge
on light mode, so it stands out against the page:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://YOUR-WORKER.workers.dev/torvalds?theme=light" />
  <img src="https://YOUR-WORKER.workers.dev/torvalds?theme=dark" alt="GitStars" />
</picture>
```

### Inside HTML blocks

GitHub doesn't parse Markdown inside HTML like `<div align="center">`, so
`![GitStars](...)` shows up as plain text there. Use an `<img>` tag instead:

```html
<div align="center">
  <img src="https://YOUR-WORKER.workers.dev/torvalds" alt="GitStars" />
</div>
```

## How stars are calculated

- Only public repositories are visible through `GET /users/:username/repos`, so private
  repositories never count.
- The request uses `type=owner`, so only repositories owned by the account are counted.
  Repositories in organizations the user contributes to are not attributed to them.
- Forks are excluded. Forking a popular project doesn't earn you its stars.
- Total stars is the sum of `stargazers_count` over the remaining repositories.
- Results are paginated 100 repositories at a time until GitHub returns a short page.

Star counts are shortened on the badge (`1.3k`, `14.9k`, `1.2M`) and written out in full
on the card (`14,892`).

## Errors

Badge URLs always answer with an SVG, never JSON, so a broken badge still says what went
wrong:

| Case | Status | Badge text |
| --- | --- | --- |
| Username fails GitHub's format rules | 400 | `invalid username` |
| Unknown route | 404 | `not found` |
| GitHub user doesn't exist | 404 | `user not found` |
| GitHub rate limit hit | 429 | `rate limited` |
| GitHub down or unexpected response | 502 | `GitHub API error` |

Usernames are validated before any request is made, and the only upstream the Worker ever
calls is `https://api.github.com/`.

## Caching

Successful responses send `Cache-Control: public, max-age=3600`, errors send
`max-age=300`. GitHub proxies README images through its camo cache, which respects these
headers.

The Worker also stores each user's computed stats in the Cloudflare Cache API for an hour,
shared across the badge and every `/top` variant. The Cache API only works when the Worker
runs on a custom domain; on `*.workers.dev` it does nothing and every uncached request
goes to GitHub.

## Development

```bash
npm install
npm run dev        # http://localhost:8787
```

| Command | Does |
| --- | --- |
| `npm run dev` | Local Worker via `wrangler dev` |
| `npm run deploy` | Deploy to Cloudflare |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Formatter, escaping, truncation, limit and username checks (`node --test`) |

```text
src/
  index.ts    routing, query params, cache, HTTP responses
  github.ts   GitHub API calls, pagination, fork filtering, totals, sorting
  svg.ts      themes, badge, top card and error SVGs
  utils.ts    number formatting, XML escaping, truncation, validation, limit parsing
```

Every piece of user-controlled text (usernames, repository names) goes through
`escapeXml` before it lands in the SVG.

## Deployment

The [Deploy to Cloudflare](#deploy-your-own) button is the shortest path. From a local
clone:

```bash
npx wrangler login
npm run deploy
```

Wrangler prints the URL, something like `https://gitstars.<your-subdomain>.workers.dev`.
The Workers free plan covers normal personal use.

## Optional GitHub token

Without a token GitHub allows 60 API requests per hour per IP, and Cloudflare's egress IPs
are shared. A token raises that to 5,000 per hour and makes public badges a lot more
reliable.

Create a fine-grained token with no extra permissions (public data needs none), then store
it as a Worker secret:

```bash
npx wrangler secret put GITHUB_TOKEN
```

For local development, copy `.dev.vars.example` to `.dev.vars` and fill in the token.
`.dev.vars` is gitignored. Never commit a token to the repository. The token is only sent
in the `Authorization` header to `api.github.com`; it never appears in SVGs, responses or
logs.

## Notes

- Each page of 100 repositories is one subrequest. The Workers free plan allows 50 per
  request, so the Worker stops after 45 pages and accounts with more than 4,500
  repositories are counted partially.
- Error badges use real HTTP status codes. GitHub's camo proxy may refuse to display
  non-200 images, in which case a README shows a broken image instead of the error badge.
- Text widths are estimated, since the Worker has no font metrics. Fonts come from the
  viewer's system stack, so spacing varies slightly between platforms.

## License

MIT

---

Created by [@rbayuokt](https://github.com/rbayuokt), made with ❤️ and 🎵
