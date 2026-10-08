import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { Checkbox } from '@/ui/inputs/checkbox';
import { Tooltip } from '@/ui/overlays/tooltip';
import {
  Copy,
  Download,
  Link2,
  MoreHorizontal,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react';
import React, { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import type { Spot } from 'App/mstore/types/spot';
import { hashString } from 'App/types/session/session';

import { SessionAvatar, hueIndexFor } from 'Shared/SessionAvatar/SessionAvatar';

interface Props {
  spot: Spot;
  selected: boolean;
  /** `extend`: shift held — select the span from the last card touched */
  onToggleSelect: (extend: boolean) => void;
  onOpen: (e: React.MouseEvent) => void;
  onRename: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

/** At rest a thumbnail, a title and a byline; the checkbox, copy link and menu
 *  show on hover / focus (always on touch, and the checkbox while selected). */
export function SpotCard({
  spot,
  selected,
  onToggleSelect,
  onOpen,
  onRename,
  onCopy,
  onDownload,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const [thumb, setThumb] = React.useState(Boolean(spot.thumbnail));
  // radix reports only the new state, so the modifier is caught a step earlier
  const extend = React.useRef(false);
  return (
    <article
      className={`m-spot-card${selected ? ' is-selected' : ''}`}
      data-test-id="spot-list-item"
    >
      <div
        className="m-spot-card__thumb"
        style={
          {
            '--m-avatar-i': hueIndexFor(hashString(spot.title)),
          } as CSSProperties
        }
      >
        {thumb ? (
          <img
            src={spot.thumbnail}
            alt=""
            className="m-spot-card__img"
            onError={() => setThumb(false)}
          />
        ) : null}
        <button
          type="button"
          className="m-spot-card__open"
          onClick={onOpen}
          aria-label={t('Play {{title}}', { title: spot.title })}
        >
          <span className="m-spot-card__play">
            <Play size={18} fill="currentColor" aria-hidden="true" />
          </span>
        </button>
        <span className="m-spot-card__pick">
          <Checkbox
            checked={selected}
            aria-label={t('Select {{title}}', { title: spot.title })}
            onPointerDown={(e) => {
              extend.current = e.shiftKey;
            }}
            onKeyDown={(e) => {
              extend.current = e.shiftKey;
            }}
            onCheckedChange={() => onToggleSelect(extend.current)}
          />
        </span>
        <span className="m-spot-card__acts">
          <Tooltip title={t('Copy link')}>
            <button
              type="button"
              className="m-spot-card__act"
              onClick={onCopy}
              aria-label={t('Copy link to {{title}}', { title: spot.title })}
            >
              <Link2 size={13} aria-hidden="true" />
            </button>
          </Tooltip>
        </span>
        <span className="m-spot-card__duration">{spot.duration}</span>
      </div>
      <div className="m-spot-card__foot">
        <div className="m-spot-card__line">
          <button
            type="button"
            className="m-spot-card__title m-truncate"
            onClick={onOpen}
            title={spot.title}
          >
            {spot.title}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="subtle"
                size="icon"
                className="m-spot-card__more"
                aria-label={t('Actions for {{title}}', { title: spot.title })}
              >
                <MoreHorizontal size={15} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItems
                items={[
                  {
                    key: 'rename',
                    icon: <Pencil size={13} />,
                    label: t('Rename'),
                    onClick: onRename,
                  },
                  {
                    key: 'copy',
                    icon: <Copy size={13} />,
                    label: t('Copy link'),
                    onClick: onCopy,
                  },
                  {
                    key: 'download',
                    icon: <Download size={13} />,
                    label: t('Download video'),
                    onClick: onDownload,
                  },
                  {
                    key: 'delete',
                    icon: <Trash2 size={13} />,
                    label: t('Delete'),
                    danger: true,
                    onClick: onDelete,
                  },
                ]}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="m-spot-card__by">
          <SessionAvatar seed={hashString(spot.user ?? '')} size={16} />
          <span className="m-truncate">{spot.user}</span>
          <span className="m-spot-card__dot" aria-hidden="true">
            ·
          </span>
          <span className="flex-none">
            <RelativeTime at={spot.createdAtMs} />
          </span>
        </div>
      </div>
    </article>
  );
}
