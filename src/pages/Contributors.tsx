import { useEffect, useState } from 'react';
import contributorsData from '../data/contributors.json';

interface Contributor {
  username: string;
  avatar: string;
  profile: string;
  prCount: number;
  waves: string[];
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
        <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-4">
          Celebrating the amazing people who build and improve Wraith Protocol.
        </p>
        <div className="bg-surface-alt rounded-lg p-4 inline-block text-left text-sm text-gray-300 border border-border">
          <p>
            <strong>Note:</strong> Data is refreshed weekly via an automated script. If you wish to
            opt-out of this leaderboard, please submit a PR to add your username to our opt-out list
            at <code>src/data/contributors-optout.json</code>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contributors.map((contributor) => (
          <a
            key={contributor.username}
            href={contributor.profile}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-6 bg-surface rounded-xl border border-border hover:border-primary transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 group"
          >
            <img
              src={contributor.avatar}
              alt={`${contributor.username}'s avatar`}
              className="w-16 h-16 rounded-full mr-5 bg-surface-alt border-2 border-transparent group-hover:border-primary transition-colors"
            />
            <div>
              <h2 className="text-xl font-semibold text-on-surface group-hover:text-primary transition-colors">
                {contributor.username}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                <span className="font-medium text-gray-200">{contributor.prCount}</span>{' '}
                Contributions
              </p>
              {contributor.waves && contributor.waves.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {contributor.waves.map((wave) => (
                    <span
                      key={wave}
                      className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full border border-primary/20"
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
          <div className="col-span-full text-center text-gray-400 py-12">
            No contributors found.
          </div>
        )}
      </div>
    </div>
  );
}
