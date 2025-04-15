import React from 'react';
import { Tooltip } from 'antd';
import { HelpCircle } from 'lucide-react'

function FetchTimings({ timings }: { timings: Record<string, number> }) {
  const formatTime = (time: number) => {
    if (time === undefined || time === null) return '—';
    if (time === 0) return '0ms';
    if (time < 1) return `${Math.round(time * 1000)}μs`;
    return `${Math.round(time)}ms`;
  };

  const total = React.useMemo(() => {
    const sumOfComponents = Object.entries(timings)
      .filter(([key]) => key !== 'total')
      .reduce((sum, [_, value]) => sum + (value || 0), 0);

    const largestComponent = Math.max(
      ...Object.entries(timings)
        .filter(([key]) => key !== 'total')
        .map(([_, value]) => value || 0),
    );

    return Math.max(timings.total || 0, sumOfComponents, largestComponent);
  }, [timings.total]);
  const isAdjusted = timings.total !== undefined && total !== timings.total;

  const phases = [
    {
      category: 'Resource Scheduling',
      children: [
        {
          key: 'queueing',
          name: 'Queueing',
          color: 'bg-[#99a1af]',
          description: 'Time spent in browser queue before connection start',
        },
        {
          key: 'stalled',
          name: 'Stalled',
          color: 'bg-[#c3c3c3]',
          description: 'Time request was stalled after connection start',
        },
      ],
    },
    {
      category: 'Connection Start',
      children: [
        {
          key: 'dnsLookup',
          name: 'DNS Lookup',
          color: 'bg-[#00c951]',
          description: 'Time spent resolving the DNS',
        },
        {
          key: 'initialConnection',
          name: 'Initial Connection',
          color: 'bg-[#efb100]',
          description: 'Time establishing connection (TCP handshakes/retries)',
        },
        {
          key: 'ssl',
          name: 'SSL',
          color: 'bg-[#ad46ff]',
          description: 'Time spent completing SSL/TLS handshake',
        },
      ],
    },
    {
      category: 'Request/Response',
      children: [
        {
          key: 'ttfb',
          name: 'Request & TTFB',
          color: 'bg-[#2b7fff]',
          description: 'Time waiting for first byte (server response time)',
        },
        {
          key: 'contentDownload',
          name: 'Content Download',
          color: 'bg-[#00a63e]',
          description: 'Time spent receiving the response data',
        },
      ],
    },
  ];

  const calculateTimelines = () => {
    let currentPosition = 0;
    const results = [];

    for (const phase of phases) {
      const parts = [];
      for (const child of phase.children) {
        const duration = timings[child.key] || 0;
        const width = (duration / total) * 100;

        parts.push({
          ...child,
          duration,
          position: currentPosition,
          width,
        });

        currentPosition += width;
      }
      results.push({
        category: phase.category,
        children: parts,
      });
    }

    return results;
  };

  const timelineData = React.useMemo(() => calculateTimelines(), [total]);

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-4 font-sans">
      <div>
        <div className="space-y-4">
          {timelineData.map((cat, index) => (
            <div>
              <div>{cat.category}</div>
              <div>
                {cat.children.map((phase, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 items-center gap-2 space-y-2"
                  >
                    <div className="col-span-4 text-sm text-gray-dark font-medium flex items-center gap-2">
                      <Tooltip title={phase.description}>
                        <HelpCircle size={12} />
                      </Tooltip>
                      <span>{phase.name}:</span>
                    </div>

                    <div className="col-span-6 relative">
                      <div className="h-5 bg-gray-lightest rounded overflow-hidden">
                        {phase.width > 0 && (
                          <div
                            className={`absolute top-0 h-full ${phase.color} hover:opacity-80 transition-opacity`}
                            style={{
                              left: `${phase.position}%`,
                              width: `${Math.max(phase.width, 0.5)}%`, // Ensure minimum visibility
                            }}
                            title={`${phase.name}: ${formatTime(phase.duration)} (starts at ${formatTime((total * phase.position) / 100)})`}
                          />
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 text-right font-mono text-sm text-gray-dark">
                      {formatTime(phase.duration)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="grid grid-cols-12 items-center gap-2 pt-2 border-t border-t-gray-light mt-2">
            <div className="col-span-3 text-sm text-gray-dark font-semibold">
              Total:
            </div>
            <div className="col-span-7"></div>
            <div className="col-span-2 text-right font-mono text-sm text-gray-dark font-semibold">
              {formatTime(total)}{' '}
              {isAdjusted ? (
                <span className="ml-1 text-xs text-yellow">
                  (adjusted from reported value: {formatTime(timings.total)})
                </span>
              ) : null}
            </div>
          </div>
          <div className="mb-2">
            <div className="relative h-6 bg-gray-lightest rounded overflow-hidden">
              {timelineData
                .flatMap((phase) => phase.children)
                .filter((phase) => phase.width > 0)
                .map((phase, index) => (
                  <div
                    key={index}
                    className={`absolute top-0 h-full ${phase.color} hover:opacity-80 transition-opacity`}
                    style={{
                      left: `${phase.position}%`,
                      width: `${Math.max(phase.width, 0.5)}%`, // Ensure minimum visibility
                    }}
                    title={`${phase.name}: ${formatTime(phase.duration)}`}
                  />
                ))}
            </div>

            <div className="flex justify-between mt-1 text-xs text-gray-medium">
              <div>0ms</div>
              <div>{formatTime(total)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FetchTimings;
