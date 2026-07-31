import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OPTOUT_FILE = path.join(__dirname, '../src/data/contributors-optout.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/contributors.json');

async function run() {
  try {
    const optOutData = await fs.readFile(OPTOUT_FILE, 'utf-8');
    const optOutList = JSON.parse(optOutData);

    console.log('Fetching contributors from GitHub API...');

    // In a real run without token, rate limits apply, so we handle fetch gracefully
    const res = await fetch('https://api.github.com/repos/wraith-protocol/www/contributors', {
      headers: {
        'User-Agent': 'Node-Fetch',
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    });

    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status} ${res.statusText}`);
    }

    const contributors = await res.json();

    const leaderboard = contributors
      .filter((c) => !optOutList.includes(c.login))
      .map((c) => ({
        username: c.login,
        avatar: c.avatar_url,
        profile: c.html_url,
        prCount: c.contributions,
        // Mock wave participation as requested, or derive if data existed.
        waves: ['Wave 1'],
      }));

    await fs.writeFile(OUTPUT_FILE, JSON.stringify(leaderboard, null, 2), 'utf-8');
    console.log(
      `Successfully generated contributors.json with ${leaderboard.length} contributors.`,
    );
  } catch (error) {
    console.error('Error generating contributors:', error);
    process.exit(1);
  }
}

run();
