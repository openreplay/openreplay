import { ListeningMark } from '@/ui/brand/ListeningMark';
import { OpenReplayMark } from '@/ui/brand/OpenReplayMark';

import './empty-art.css';

export type EmptyArtVariant =
  | 'frame'
  | 'listening'
  | 'processing'
  | 'search'
  | 'bookmark'
  | 'range'
  | 'window'
  | 'dashboard'
  | 'cards'
  | 'alert'
  | 'activity'
  | 'people'
  | 'events'
  | 'properties'
  | 'features'
  | 'spot'
  | 'cobrowse'
  | 'issues'
  | 'tests'
  | 'audit';

export function EmptyArt({ variant = 'frame' }: { variant?: EmptyArtVariant }) {
  return (
    <span className={`m-eart m-eart--${variant}`} aria-hidden="true">
      <svg viewBox="0 0 132 92" className="m-eart__svg">
        <rect
          x="2"
          y="2"
          width="128"
          height="88"
          rx="9"
          className="m-eart__frame"
          pathLength={100}
        />
        <line
          x1="2"
          y1="20"
          x2="130"
          y2="20"
          className="m-eart__bar"
          pathLength={100}
        />
        <circle cx="12" cy="11" r="2" className="m-eart__dot" />
        <circle cx="20" cy="11" r="2" className="m-eart__dot" />
        <circle cx="28" cy="11" r="2" className="m-eart__dot" />

        {variant === 'search' && (
          <>
            <line x1="14" y1="36" x2="70" y2="36" className="m-eart__row" />
            <line x1="14" y1="50" x2="52" y2="50" className="m-eart__row" />
            <line x1="14" y1="64" x2="62" y2="64" className="m-eart__row" />
            <circle
              cx="96"
              cy="52"
              r="13"
              className="m-eart__glass"
              pathLength={100}
            />
            <line
              x1="106"
              y1="62"
              x2="116"
              y2="72"
              className="m-eart__glass"
              pathLength={100}
            />
          </>
        )}

        {variant === 'bookmark' && (
          <>
            <line x1="14" y1="40" x2="66" y2="40" className="m-eart__row" />
            <line x1="14" y1="54" x2="50" y2="54" className="m-eart__row" />
            <line x1="14" y1="68" x2="58" y2="68" className="m-eart__row" />
            <path
              d="M92 30h20v40l-10-8-10 8z"
              className="m-eart__ribbon"
              pathLength={100}
            />
          </>
        )}

        {variant === 'dashboard' && (
          <>
            <rect
              x="12"
              y="28"
              width="52"
              height="26"
              rx="3"
              className="m-eart__slot"
            />
            <rect
              x="68"
              y="28"
              width="52"
              height="26"
              rx="3"
              className="m-eart__slot"
            />
            <rect
              x="12"
              y="58"
              width="52"
              height="26"
              rx="3"
              className="m-eart__slot"
            />
            <rect
              x="68"
              y="58"
              width="52"
              height="26"
              rx="3"
              className="m-eart__slot"
            />
            <path
              d="M18 48l9-7 8 4 9-10 8 3 6-6"
              className="m-eart__spark"
              pathLength={100}
            />
          </>
        )}

        {variant === 'cards' && (
          <>
            <rect
              x="12"
              y="30"
              width="32"
              height="46"
              rx="3"
              className="m-eart__slot"
            />
            <rect
              x="50"
              y="30"
              width="32"
              height="46"
              rx="3"
              className="m-eart__slot"
            />
            <rect
              x="88"
              y="30"
              width="32"
              height="46"
              rx="3"
              className="m-eart__slot"
            />
            <rect
              x="56"
              y="42"
              width="20"
              height="5"
              rx="1"
              className="m-eart__ghost"
            />
            <rect
              x="59"
              y="52"
              width="14"
              height="5"
              rx="1"
              className="m-eart__ghost"
            />
            <rect
              x="62"
              y="62"
              width="8"
              height="5"
              rx="1"
              className="m-eart__ghost"
            />
            <circle cx="98" cy="44" r="2.5" className="m-eart__ghost" />
            <circle cx="108" cy="50" r="3.5" className="m-eart__ghost" />
            <circle cx="100" cy="62" r="2" className="m-eart__ghost" />
            <circle cx="111" cy="66" r="2.5" className="m-eart__ghost" />
            <path
              d="M17 64l6-8 5 4 6-12 5 6 3-4"
              className="m-eart__spark"
              pathLength={100}
            />
          </>
        )}

        {variant === 'alert' && (
          <>
            <path
              d="M14 70l14-6 12 4 14-12 12 8 12-20 12 6 14-14"
              className="m-eart__trend"
              pathLength={100}
            />
            <line
              x1="14"
              y1="50"
              x2="118"
              y2="50"
              className="m-eart__spark"
              pathLength={100}
            />
            <circle cx="74.5" cy="50" r="3.5" className="m-eart__cross" />
          </>
        )}

        {variant === 'activity' && (
          <>
            <line x1="24" y1="30" x2="24" y2="84" className="m-eart__slot" />
            <circle cx="24" cy="58" r="2.5" className="m-eart__ghost" />
            <line x1="34" y1="58" x2="86" y2="58" className="m-eart__row" />
            <circle cx="24" cy="74" r="2.5" className="m-eart__ghost" />
            <line x1="34" y1="74" x2="72" y2="74" className="m-eart__row" />
            <circle
              cx="24"
              cy="42"
              r="3.5"
              className="m-eart__cross m-eart__cross--a"
            />
            <line
              x1="34"
              y1="42"
              x2="98"
              y2="42"
              className="m-eart__spark"
              pathLength={100}
            />
          </>
        )}

        {variant === 'people' && (
          <>
            <circle cx="66" cy="46" r="8" className="m-eart__slot" />
            <path d="M50 74a16 16 0 0 1 32 0" className="m-eart__slot" />
            <circle cx="102" cy="46" r="8" className="m-eart__slot" />
            <path d="M86 74a16 16 0 0 1 32 0" className="m-eart__slot" />
            <circle
              cx="30"
              cy="46"
              r="8"
              className="m-eart__spark"
              pathLength={100}
            />
            <path
              d="M14 74a16 16 0 0 1 32 0"
              className="m-eart__spark"
              pathLength={100}
            />
          </>
        )}

        {variant === 'events' && (
          <>
            <rect
              x="14"
              y="52"
              width="9"
              height="9"
              rx="1.5"
              className="m-eart__slot"
            />
            <line x1="30" y1="56.5" x2="74" y2="56.5" className="m-eart__row" />
            <rect
              x="14"
              y="68"
              width="9"
              height="9"
              rx="1.5"
              className="m-eart__slot"
            />
            <line x1="30" y1="72.5" x2="60" y2="72.5" className="m-eart__row" />
            <path
              d="M15 36l6 14 2-5 5-2z"
              className="m-eart__spark"
              pathLength={100}
            />
            <line
              x1="30"
              y1="40.5"
              x2="86"
              y2="40.5"
              className="m-eart__spark"
              pathLength={100}
            />
            <circle
              cx="15"
              cy="36"
              r="6"
              className="m-eart__ring"
              pathLength={100}
            />
          </>
        )}

        {variant === 'properties' && (
          <>
            <rect
              x="14"
              y="52"
              width="24"
              height="8"
              rx="4"
              className="m-eart__slot"
            />
            <line x1="46" y1="56" x2="90" y2="56" className="m-eart__row" />
            <rect
              x="14"
              y="68"
              width="30"
              height="8"
              rx="4"
              className="m-eart__slot"
            />
            <line x1="52" y1="72" x2="80" y2="72" className="m-eart__row" />
            <rect
              x="14"
              y="36"
              width="20"
              height="8"
              rx="4"
              className="m-eart__spark m-eart__spark--fill"
            />
            <line
              x1="42"
              y1="40"
              x2="100"
              y2="40"
              className="m-eart__spark"
              pathLength={100}
            />
          </>
        )}

        {variant === 'features' && (
          <>
            <rect
              x="14"
              y="28"
              width="104"
              height="8"
              rx="2"
              className="m-eart__ghost"
            />
            <line x1="14" y1="46" x2="70" y2="46" className="m-eart__row" />
            <line x1="14" y1="56" x2="54" y2="56" className="m-eart__row" />
            <rect
              x="14"
              y="66"
              width="34"
              height="12"
              rx="3"
              className="m-eart__spark"
              pathLength={100}
            />
            <path d="M53 65.5h11l5.5 6.5-5.5 6.5H53z" className="m-eart__tag" />
            <circle cx="57" cy="72" r="1.3" className="m-eart__tag-hole" />
          </>
        )}

        {variant === 'spot' && (
          <>
            <rect
              x="14"
              y="30"
              width="104"
              height="38"
              rx="3"
              className="m-eart__slot"
            />
            <line x1="14" y1="80" x2="118" y2="80" className="m-eart__row" />
            <circle cx="24" cy="80" r="3.5" className="m-eart__cross" />
            <circle cx="24" cy="80" r="7" className="m-eart__ring" />
          </>
        )}

        {variant === 'cobrowse' && (
          <>
            <path d="M40 40l6 14 2-5 5-2z" className="m-eart__ghost" />
            <line x1="14" y1="72" x2="60" y2="72" className="m-eart__row" />
            <line x1="70" y1="72" x2="118" y2="72" className="m-eart__row" />
            <path
              d="M82 46l6 14 2-5 5-2z"
              className="m-eart__spark m-eart__spark--fill"
            />
            <circle cx="82" cy="46" r="6" className="m-eart__ring" />
          </>
        )}

        {variant === 'issues' && (
          <>
            <line x1="14" y1="38" x2="88" y2="38" className="m-eart__row" />
            <line x1="14" y1="56" x2="74" y2="56" className="m-eart__row" />
            <line x1="14" y1="74" x2="96" y2="74" className="m-eart__row" />
            <path
              d="M98 62v-12h12l-3 4 3 4h-9"
              className="m-eart__spark"
              pathLength={100}
            />
          </>
        )}

        {variant === 'tests' && (
          <>
            <circle cx="22" cy="36" r="5" className="m-eart__slot" />
            <line x1="34" y1="36" x2="90" y2="36" className="m-eart__row" />
            <circle cx="22" cy="56" r="5" className="m-eart__slot" />
            <line x1="34" y1="56" x2="76" y2="56" className="m-eart__row" />
            <circle cx="22" cy="76" r="5" className="m-eart__slot" />
            <line x1="34" y1="76" x2="84" y2="76" className="m-eart__row" />
            <line x1="22" y1="41" x2="22" y2="51" className="m-eart__row" />
            <line x1="22" y1="61" x2="22" y2="71" className="m-eart__row" />
            <path
              d="M19.2 36.2l2 2 3.8-4.2"
              className="m-eart__tick m-eart__tick--1"
              pathLength={100}
            />
            <path
              d="M19.2 56.2l2 2 3.8-4.2"
              className="m-eart__tick m-eart__tick--2"
              pathLength={100}
            />
            <path
              d="M19.2 76.2l2 2 3.8-4.2"
              className="m-eart__tick m-eart__tick--3"
              pathLength={100}
            />
            <rect
              x="98"
              y="30"
              width="20"
              height="12"
              rx="6"
              className="m-eart__pass"
            />
          </>
        )}

        {variant === 'audit' && (
          <>
            <line x1="16" y1="36" x2="66" y2="36" className="m-eart__row" />
            <line x1="16" y1="48" x2="58" y2="48" className="m-eart__row" />
            <line x1="16" y1="60" x2="62" y2="60" className="m-eart__row" />
            <line x1="16" y1="72" x2="50" y2="72" className="m-eart__row" />
            <circle cx="98" cy="54" r="15" className="m-eart__slot" />
            <path
              d="M98 39a15 15 0 1 1-13 22.5"
              className="m-eart__spark"
              pathLength={100}
            />
          </>
        )}

        {variant === 'window' && (
          /* the sessions as ticks on a timeline, the window an empty bracket
             to their right that widens until it takes them in */
          <>
            <line x1="14" y1="56" x2="118" y2="56" className="m-eart__slot" />
            <line x1="24" y1="49" x2="24" y2="63" className="m-eart__row" />
            <line x1="33" y1="49" x2="33" y2="63" className="m-eart__row" />
            <line x1="46" y1="49" x2="46" y2="63" className="m-eart__row" />
            <line x1="53" y1="49" x2="53" y2="63" className="m-eart__row" />
            <line x1="64" y1="49" x2="64" y2="63" className="m-eart__row" />
            <path
              d="M118 42h-5v28h5"
              className="m-eart__spark"
              pathLength={100}
            />
            <path
              d="M80 42h-5v28h5"
              className="m-eart__spark m-eart__win-l"
              pathLength={100}
            />
            <circle
              cx="118"
              cy="56"
              r="2.5"
              className="m-eart__cross m-eart__cross--now"
            />
          </>
        )}

        {variant === 'range' && (
          <>
            <rect
              x="34"
              y="34"
              width="64"
              height="40"
              rx="5"
              className="m-eart__cal"
              pathLength={100}
            />
            <line x1="34" y1="46" x2="98" y2="46" className="m-eart__cal" />
            <line x1="50" y1="30" x2="50" y2="38" className="m-eart__cal" />
            <line x1="82" y1="30" x2="82" y2="38" className="m-eart__cal" />
            <rect
              x="60"
              y="54"
              width="12"
              height="10"
              rx="2"
              className="m-eart__today"
            />
          </>
        )}
      </svg>

      {(variant === 'frame' || variant === 'processing') && (
        <span
          className={`m-eart__center m-eart__center--mark${variant === 'processing' ? ' is-on' : ''}`}
        >
          <OpenReplayMark
            variant="plain"
            filled={variant === 'processing'}
            size={22}
          />
        </span>
      )}
      {variant === 'processing' && (
        <span className="m-eart__timeline">
          <span className="m-eart__runner m-lt m-lt--x">
            <span className="m-lt__bloom" />
            <span className="m-lt__core" />
          </span>
        </span>
      )}
      {variant === 'listening' && (
        <span className="m-eart__center">
          <ListeningMark label="Listening" size={30} />
        </span>
      )}
    </span>
  );
}
