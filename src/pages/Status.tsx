import { useStatus } from '../hooks/useStatus';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Clock } from 'lucide-react';

export default function Status() {
  const { data, loading, error, refetch, lastUpdated } = useStatus();

  const getStatusBadge = (status: 'operational' | 'degraded' | 'outage') => {
    switch (status) {
      case 'operational':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
            <CheckCircle2 className="w-3.5 h-3.5" /> Operational
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500">
            <AlertTriangle className="w-3.5 h-3.5" /> Degraded Performance
          </span>
        );
      case 'outage':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500">
            <XCircle className="w-3.5 h-3.5" /> Partial Outage
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-on-surface">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-surface-border">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Status</h1>
          <p className="text-sm text-on-surface-muted mt-1">
            Real-time availability and uptime telemetry across Wraith Protocol infrastructure.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-on-surface-muted flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Updated {new Date(lastUpdated).toLocaleTimeString()}
          </span>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-surface-border hover:bg-surface-hover transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Overall Banner */}
      {error && !data ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 mb-8">
          <p className="font-medium">Unable to connect to live telemetry endpoints.</p>
          <p className="text-xs mt-1 opacity-80">
            Displaying last known cached statuses. Retrying automatically...
          </p>
        </div>
      ) : data ? (
        <div
          className={`p-4 rounded-xl mb-8 flex items-center justify-between border ${
            data.overall === 'operational'
              ? 'bg-green-500/5 border-green-500/20 text-green-600 dark:text-green-400'
              : 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400'
          }`}
        >
          <div className="flex items-center gap-3">
            {data.overall === 'operational' ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-500" />
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
            className="p-5 rounded-xl border border-surface-border bg-surface-card shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium">{comp.name}</h3>
                <span className="text-xs text-on-surface-muted">Latency: {comp.latencyMs}ms</span>
              </div>
              {getStatusBadge(comp.status)}
            </div>

            {/* 90-Day Uptime Bar Chart */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-on-surface-muted mb-1.5">
                <span>90 days ago</span>
                <span>Today</span>
              </div>
              <div className="flex items-center gap-0.5 h-6">
                {comp.uptime90Days.map((val, idx) => (
                  <div
                    key={idx}
                    title={`Day ${idx + 1}: ${val === 1 ? '100% Uptime' : 'Degraded'}`}
                    className={`flex-1 h-full rounded-xs transition-colors hover:opacity-80 ${
                      val === 1 ? 'bg-green-500/80' : val > 0 ? 'bg-amber-500' : 'bg-red-500'
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
                className="p-6 rounded-xl border border-surface-border bg-surface-card"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">{incident.title}</h3>
                  <span className="text-xs uppercase tracking-wider px-2.5 py-1 rounded-md bg-surface-hover font-medium">
                    {incident.status}
                  </span>
                </div>
                <p className="text-xs text-on-surface-muted mb-4">
                  Started on {new Date(incident.date).toUTCString()}
                </p>
                <div className="space-y-3 pl-4 border-l-2 border-surface-border">
                  {incident.updates.map((update, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="text-xs text-on-surface-muted block mb-0.5">
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
          <p className="text-sm text-on-surface-muted">
            No incidents reported in the recent period.
          </p>
        )}
      </div>
    </div>
  );
}
