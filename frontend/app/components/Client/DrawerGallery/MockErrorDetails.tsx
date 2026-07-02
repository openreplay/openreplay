import { Button } from 'antd';
import { ChevronRight, Info, Monitor, Play } from 'lucide-react';
import React from 'react';

/** Static visual replica of Errors/Error/ErrorInfo (the error-detail drawer opened
 *  from Console / Network / timeline / dashboards). No interaction — reference only.
 *  Real width: 1200px. Layout: MainSection (9/12) + SideSection (3/12). */

const FRAMES = [
  {
    fn: 'handleCheckoutSubmit',
    file: 'app/checkout/CheckoutForm.tsx',
    line: 142,
    col: 17,
    first: true,
  },
  { fn: 'onClick', file: 'app/checkout/PayButton.tsx', line: 38, col: 9 },
  { fn: 'dispatchEvent', file: 'react-dom.production.min.js', line: 52, col: 317 },
  { fn: 'invokeGuardedCallback', file: 'react-dom.production.min.js', line: 49, col: 102 },
];

function Label({ top, bottom }: { top: string; bottom: string }) {
  return (
    <div className="mr-8">
      <div className="text-lg font-semibold leading-tight">{top}</div>
      <div className="text-xs color-gray-medium">{bottom}</div>
    </div>
  );
}

function Sparkline({ color = '#394EFF' }: { color?: string }) {
  const pts = [12, 9, 14, 8, 18, 11, 22, 16, 24, 13, 28, 20];
  const max = Math.max(...pts);
  const w = 220;
  const h = 44;
  const step = w / (pts.length - 1);
  const d = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - (p / max) * h}`)
    .join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

function DistBar({
  title,
  segs,
}: {
  title: string;
  segs: { label: string; prc: number; color: string }[];
}) {
  return (
    <div className="mb-6">
      <div className="flex justify-between text-sm mb-1">
        <div className="capitalize">{title}</div>
        <div className="flex items-center">
          <div className="font-thin capitalize">{segs[0].label}</div>
          <div className="ml-2">{Math.round(segs[0].prc)}%</div>
        </div>
      </div>
      <div className="flex h-2 rounded overflow-hidden">
        {segs.map((s) => (
          <div
            key={s.label}
            style={{ width: `${s.prc}%`, backgroundColor: s.color, marginLeft: 1 }}
          />
        ))}
      </div>
    </div>
  );
}

function MockErrorDetails() {
  return (
    <div className="bg-white h-screen overflow-y-auto p-4">
      <div className="flex w-full gap-4">
        {/* MAIN SECTION — 9/12 */}
        <div className="w-9/12 bg-white border rounded thin-gray-border">
          <div className="m-4">
            <div className="text-lg leading-relaxed font-semibold">
              TypeError
            </div>
            <div
              className="flex items-center color-gray-dark font-semibold"
              style={{ wordBreak: 'break-all' }}
            >
              Cannot read properties of undefined (reading 'total')
            </div>
            <div className="flex items-center mt-2">
              <div className="flex">
                <Label top="1,284" bottom="Sessions" />
                <Label top="412" bottom="Users" />
              </div>
              <div className="text-xs color-gray-medium">
                Over the past 30 days
              </div>
            </div>
          </div>

          <div className="border-t" />

          <div className="m-4">
            <div className="flex items-center">
              <h3 className="text-xl inline-block mr-2">
                Last session with this error
              </h3>
              <span className="font-thin text-sm color-gray-medium">
                2h ago
              </span>
              <Button
                type="text"
                className="ml-auto text-main"
                iconPosition="end"
                icon={<ChevronRight size={16} />}
              >
                Find all sessions with this error
              </Button>
            </div>
            {/* SessionBar */}
            <div className="my-4 flex items-center gap-3 border rounded p-3 bg-gray-lightest">
              <div className="w-9 h-9 rounded-full bg-tealx-lightest flex items-center justify-center text-tealx font-semibold">
                JM
              </div>
              <div className="flex-1">
                <div className="font-medium">user_8842@example.com</div>
                <div className="text-xs color-gray-medium flex items-center gap-2">
                  <Monitor size={12} /> Chrome 124 · macOS · Paris
                </div>
              </div>
              <Button icon={<Play size={13} />}>Play</Button>
            </div>
          </div>

          <div className="border-t" />

          {/* Stacktrace */}
          <div className="m-4">
            <div className="flex items-center my-3">
              <h3 className="text-xl mr-auto">Stacktrace</h3>
              <div className="flex justify-end">
                <Button type="text" className="text-main">
                  FULL
                </Button>
                <Button type="text">RAW</Button>
              </div>
            </div>

            <div
              className="mb-3 flex items-center text-sm rounded-sm border p-2"
              style={{ backgroundColor: 'rgba(204, 0, 0, 0.1)' }}
            >
              <Info size={16} className="color-red shrink-0" />
              <div className="ml-2 color-red">
                Source maps must be uploaded to OpenReplay to be able to see
                stack traces.{' '}
                <a href="#" className="underline font-medium color-red">
                  Learn more.
                </a>
              </div>
            </div>

            <div className="mb-6 code-font">
              <div className="leading-relaxed font-bold">TypeError</div>
              <div style={{ wordBreak: 'break-all' }}>
                Cannot read properties of undefined (reading 'total')
              </div>
            </div>

            {FRAMES.map((f) => (
              <div
                key={f.file + f.line}
                className={`mb-3 rounded border p-3 code-font text-sm ${
                  f.first ? 'border-l-0 bg-red-lightest' : ''
                }`}
              >
                <div className="font-semibold">{f.fn}</div>
                <div className="color-gray-dark">
                  {f.file}:{f.line}:{f.col}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SIDE SECTION — 3/12 */}
        <div className="w-3/12 pl-1">
          <h3 className="text-xl mb-2">Overview</h3>
          <div className="text-sm color-gray-medium mb-1">Past 24 hours</div>
          <Sparkline />
          <div className="mb-6" />
          <div className="text-sm color-gray-medium mb-1">Last 30 days</div>
          <Sparkline color="#3EAAAF" />

          <div className="my-4">
            <div className="text-sm color-gray-medium">First Seen</div>
            <div className="font-medium">18 days ago</div>
          </div>
          <div className="my-4">
            <div className="text-sm color-gray-medium">Last Seen</div>
            <div className="font-medium">2 hours ago</div>
          </div>

          <h4 className="text-xl mt-6 mb-3">Summary</h4>
          <DistBar
            title="browser"
            segs={[
              { label: 'Chrome', prc: 68, color: '#394EFF' },
              { label: 'Safari', prc: 21, color: '#3EAAAF' },
              { label: 'Other', prc: 11, color: '#E28940' },
            ]}
          />
          <DistBar
            title="country"
            segs={[
              { label: 'France', prc: 44, color: '#394EFF' },
              { label: 'USA', prc: 33, color: '#3EAAAF' },
              { label: 'Other', prc: 23, color: '#E28940' },
            ]}
          />
          <DistBar
            title="os"
            segs={[
              { label: 'macOS', prc: 52, color: '#394EFF' },
              { label: 'Windows', prc: 38, color: '#3EAAAF' },
              { label: 'Other', prc: 10, color: '#E28940' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

export default MockErrorDetails;
