import { useStatus } from '../hooks/useStatus';

export default function Status() {
  const { data, loading, error, refetch, lastUpdated } = useStatus();

  const getStatusBadge = (status: 'operational' | 'degraded' | 'outage') => {
    switch (status) {
      case 'operational':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-tertiary-10 text-tertiary border border-tertiary/30">
            Operational
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-surface-bright text-on-surface-variant border border-outline-variant">
            Degraded Performance
          </span>
        );
      case 'outage':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-error-10 text-error border border-error-30">
            Partial Outage
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-on-surface">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-outline-variant">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Status</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Real-time availability and uptime telemetry across Wraith Protocol infrastructure.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-outline">
              Updated {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-outline-variant hover:bg-surface-bright transition-colors"
            title="Refresh status"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Overall Banner */}
      {error && !data ? (
        <div className="p-4 rounded-xl bg-surface-container border border-outline-variant text-on-surface mb-8">
          <p className="font-medium">Status unavailable.</p>
          <p className="text-xs mt-1 text-on-surface-variant">
            Live component data could not be loaded. Please try again later.
          </p>
        </div>
      ) : data ? (
        <div
          className={`p-4 rounded-xl mb-8 flex items-center justify-between border ${
            data.overall === 'operational'
              ? 'bg-tertiary-10 border-tertiary/30 text-tertiary'
              : 'bg-error-10 border-error-30 text-error'
          }`}
        >
          <div className="flex items-center gap-3">
            {data.overall === 'operational' ? (
              <span className="h-2 w-2 rounded-full bg-tertiary" aria-hidden="true" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-error" aria-hidden="true" />
            )}
            <span className="font-semibold text-lg">
              {data.overall === 'operational'
                ? 'All Systems Operational'
                : 'Some Systems Experiencing Degraded Performance'}
            </span>
          </div>
          {getStatusBadge(data.overall)}
        </div>
      ) : null}

      {/* Component Tiles */}
      <div className="space-y-4 mb-12">
        <h2 className="text-xl font-semibold mb-4">Components</h2>
        {data?.components.map((comp) => (
          <div
            key={comp.id}
            className="p-5 rounded-xl border border-outline-variant bg-surface-container shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium">{comp.name}</h3>
                <span className="text-xs text-outline">Latency: {comp.latencyMs}ms</span>
              </div>
              {getStatusBadge(comp.status)}
            </div>

            {/* 90-Day Uptime Bar Chart */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-outline mb-1.5">
                <span>90 days ago</span>
                <span>Today</span>
              </div>
              <div className="flex items-center gap-0.5 h-6">
                {comp.uptime90Days.map((val, idx) => (
                  <div
                    key={idx}
                    title={`Day ${idx + 1}: ${val === 1 ? '100% Uptime' : 'Degraded'}`}
                    className={`flex-1 h-full rounded-xs transition-colors hover:opacity-80 ${
                      val === 1 ? 'bg-tertiary' : val > 0 ? 'bg-outline' : 'bg-error'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Incident Log */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Incident History</h2>
        {data?.incidents && data.incidents.length > 0 ? (
          <div className="space-y-6">
            {data.incidents.map((incident) => (
              <div
                key={incident.id}
                className="p-6 rounded-xl border border-outline-variant bg-surface-container"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">{incident.title}</h3>
                  <span className="text-xs uppercase tracking-wider px-2.5 py-1 rounded-md bg-surface-bright font-medium">
                    {incident.status}
                  </span>
                </div>
                <p className="text-xs text-outline mb-4">
                  Started on {new Date(incident.date).toUTCString()}
                </p>
                <div className="space-y-3 pl-4 border-l-2 border-outline-variant">
                  {incident.updates.map((update, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="text-xs text-outline block mb-0.5">
                        {new Date(update.timestamp).toUTCString()}
                      </span>
                      <p>{update.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">
            No incidents reported in the recent period.
          </p>
        )}
      </div>
    </div>
  );
}
