// Fetches public LeetCode stats and writes leetcode-stats.json.
// Run by the "Update LeetCode stats" GitHub Action. Needs Node 18 or newer.
import { writeFileSync } from 'node:fs';

const USERNAME = process.env.LEETCODE_USERNAME || 'akshatmaheshwar78';
const OUT = process.env.OUT_FILE || 'leetcode-stats.json';

const query = `
query userStats($username: String!) {
  matchedUser(username: $username) {
    profile { ranking }
    submitStatsGlobal { acSubmissionNum { difficulty count } }
  }
  userContestRanking(username: $username) {
    rating
    attendedContestsCount
    globalRanking
    totalParticipants
    topPercentage
  }
}`;

export function parse(data) {
  const user = data && data.data && data.data.matchedUser;
  if (!user) throw new Error('User not found in response');
  const counts = {};
  for (const row of user.submitStatsGlobal.acSubmissionNum) counts[row.difficulty] = row.count;
  const contest = (data.data.userContestRanking) || {};
  return {
    username: USERNAME,
    ranking: (user.profile && user.profile.ranking) || null,
    solved: counts.All,
    easy: counts.Easy,
    medium: counts.Medium,
    hard: counts.Hard,
    rating: contest.rating == null ? null : Math.round(contest.rating),
    contests: contest.attendedContestsCount ?? null,
    globalRanking: contest.globalRanking ?? null,
    totalParticipants: contest.totalParticipants ?? null,
    topPercentage: contest.topPercentage == null ? null : Math.round(contest.topPercentage),
    updated: new Date().toISOString()
  };
}

async function main() {
  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': 'https://leetcode.com/u/' + USERNAME + '/',
      'User-Agent': 'Mozilla/5.0 (compatible; portfolio-stats/1.0)'
    },
    body: JSON.stringify({ query, variables: { username: USERNAME } })
  });
  if (!res.ok) throw new Error('LeetCode responded with HTTP ' + res.status);
  const out = parse(await res.json());
  if (typeof out.solved !== 'number') throw new Error('No solved count in response');
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log('Wrote', OUT, out);
}

if (import.meta.url === 'file://' + process.argv[1]) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
