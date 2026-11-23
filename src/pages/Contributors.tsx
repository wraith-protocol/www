import { useEffect, useState } from 'react';
import { trackOutbound } from '../utils/track';
import contributorsData from '../data/contributors.json';

interface Contributor {
  username: string;
  avatar: string;
  profile: string;
  prCount: number;
  waves: string[];
}

function ContributorAvatar({ username, avatar }: { username: string; avatar: string }) {
  const [failed, setFailed] = useState(false);
  const initials = username.slice(0, 2).toUpperCase();

  if (!avatar || failed) {
    return (
      <div
        role="img"
        aria-label={`${username}'s avatar`}
        className="mr-5 flex h-16 w-16 shrink-0 items-center justify-center border border-outline-variant bg-surface-container font-heading text-lg font-bold text-primary"
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={avatar}
      alt={`${username}'s avatar`}
      width={64}
      height={64}
      onError={() => setFailed(true)}
      className="mr-5 h-16 w-16 shrink-0 border border-outline-variant bg-surface-container object-cover transition-colors group-hover:border-primary"
    />
  );
}

export default function Contributors() {
  const [contributors, setContributors] = useState<Contributor[]>([]);

  useEffect(() => {
    // Data is static for the client and refreshed weekly by a GitHub Action/script.
    // We import it directly here.
    setContributors(contributorsData as Contributor[]);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-on-surface">
          Contributor Leaderboard
        </h1>
        <p className="text-xl text-on-surface-variant max-w-3xl mx-auto mb-4">
          Celebrating the amazing people who build and improve Wraith Protocol.
        </p>
        <div className="bg-surface-container p-4 inline-block text-left text-sm text-on-surface-variant border border-outline-variant">
          <p>
            <strong className="text-on-surface">Note:</strong> Data is refreshed weekly via an
            automated script. If you wish to opt-out of this leaderboard, please submit a PR to add
            your username to our opt-out list at{' '}
            <code className="font-mono text-xs text-primary">
              src/data/contributors-optout.json
            </code>
            .
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contributors.map((contributor) => (
          <a
            key={contributor.username}
            href={contributor.profile}
            target="_blank"
            onClick={trackOutbound('github')}
            rel="noopener noreferrer"
            className="flex items-center p-6 bg-surface-container border border-outline-variant hover:border-primary transition-colors group"
          >
            <ContributorAvatar username={contributor.username} avatar={contributor.avatar} />
            <div>
              <h2 className="text-xl font-semibold text-on-surface group-hover:text-primary transition-colors">
                {contributor.username}
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                <span className="font-semibold text-on-surface">{contributor.prCount}</span>{' '}
                Contributions
              </p>
              {contributor.waves && contributor.waves.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {contributor.waves.map((wave) => (
                    <span
                      key={wave}
                      className="text-xs px-2.5 py-1 bg-surface-bright text-primary border border-outline-variant"
                    >
                      {wave}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </a>
        ))}
        {contributors.length === 0 && (
          <div className="col-span-full text-center text-on-surface-variant py-12">
            No contributors found.
          </div>
        )}
      </div>
    </div>
  );
}
