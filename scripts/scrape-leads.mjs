// Lead scraper — pulls stargazers from competitor repos (the people who actually use LLM APIs).
// Uses the GitHub REST API. Set GITHUB_TOKEN for 5,000 req/h (60/h unauthenticated).
// Usage: GITHUB_TOKEN=ghp_xxx node scripts/scrape-leads.mjs > leads.csv

const REPOS = [
  'BerriAI/litellm',
  'helicone/helicone',
  'langchain-ai/langsmith',
  'BerriAI/litellm',
  'microsoft/promptflow',
  'traceloop/openllmetry',
  'langfuse/langfuse',
  'danswer-ai/danswer',
];
const PAGES_PER_REPO = Number(process.env.PAGES || 3); // 100 stargazers per page
const headers = { 'User-Agent': 'rynler-leads', Accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const seen = new Set();
const leads = [];

for (const repo of [...new Set(REPOS)]) {
  for (let page = 1; page <= PAGES_PER_REPO; page++) {
    const res = await fetch(`https://api.github.com/repos/${repo}/stargazers?per_page=100&page=${page}`, { headers });
    if (!res.ok) { console.error(`${repo} p${page}: ${res.status}`); break; }
    const users = await res.json();
    if (!users.length) break;
    for (const u of users) {
      if (seen.has(u.login)) continue;
      seen.add(u.login);
      leads.push({ login: u.login, avatar: u.avatar_url, profile: u.html_url, type: u.type });
    }
    await new Promise((r) => setTimeout(r, 300));
  }
}

console.error(`Collected ${leads.length} unique users — enriching profiles...`);
console.log('login,name,company,location,email,blog,profile');

for (const lead of leads) {
  const res = await fetch(`https://api.github.com/users/${lead.login}`, { headers });
  if (!res.ok) continue;
  const u = await res.json();
  const esc = (t) => (t ? `"${String(t).replace(/"/g, '""')}"` : '');
  console.log([u.login, esc(u.name), esc(u.company), esc(u.location), esc(u.email), esc(u.blog), u.html_url].join(','));
  await new Promise((r) => setTimeout(r, 200));
}
