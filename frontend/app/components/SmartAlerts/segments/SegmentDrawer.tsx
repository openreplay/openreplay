import { Alert, Button, Drawer, Input, Segmented, Switch, Tooltip } from 'antd';
import { Check, Info, Lock, Plus, Users } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useStore } from 'App/mstore';

import SessionFilters from 'Shared/SessionFilters';

import type { SavedSegment } from '../api';

/* Create/edit surface for a segment — the same slide-out used from Issues and
   from Data Management. The query editor is the literal Sessions omni-search
   (<SessionFilters/>, bound to the global searchStore): its filters are
   snapshotted on open and restored on close, so the Sessions page never
   notices. Segments created from Issues are forced team-visible — capture is a
   shared setting, so everyone must be able to stop it. */

interface Props {
  open: boolean;
  /** editing an existing segment; null = creating a new one */
  segment: SavedSegment | null;
  /** where the drawer was opened from — gates the visibility control */
  source: 'issues' | 'dm';
  onClose: () => void;
  /** called after a successful save, so the opener can refresh its list */
  onSaved?: () => void;
}

function SegmentDrawer({ open, segment, source, onClose, onSaved }: Props) {
  const { issuesStore, searchStore } = useStore();
  const { t } = useTranslation();
  const fromIssues = source === 'issues';
  // teammates' segments open read-only; anyone still toggles capture from the
  // list, just not the query
  const readOnly = Boolean(segment && !segment.mine);
  const [name, setName] = React.useState('');
  const [instructions, setInstructions] = React.useState('');
  const [isPublic, setIsPublic] = React.useState(true);
  const [capture, setCapture] = React.useState(false);
  const [showInstructions, setShowInstructions] = React.useState(false);
  const snapshot = React.useRef<any[] | null>(null);

  // seed the fields from the segment when the drawer opens — adjusting state
  // during render (React's alternative to an effect for prop-derived state)
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(segment?.name ?? '');
      setInstructions(segment?.instructions ?? '');
      setIsPublic(fromIssues ? true : (segment?.isPublic ?? true));
      setCapture(segment?.active ?? fromIssues);
      setShowInstructions(Boolean(segment?.instructions));
    }
  }

  // borrow the searchStore while open: snapshot -> load this segment's query
  // (or empty) -> hand it back on close. Filters round-trip as FilterItem at
  // runtime (Search types them loosely), so cast at the boundary like the rest
  // of the search code does.
  React.useEffect(() => {
    if (open) {
      snapshot.current = searchStore.instance.filters;
      searchStore.edit({
        filters: (segment ? [...segment.filters] : []) as any,
      });
    } else if (snapshot.current) {
      searchStore.edit({ filters: snapshot.current as any });
      snapshot.current = null;
    }
  }, [open, segment]);

  const filters = searchStore.instance.filters;
  const narrowed = filters.length > 0;

  const publicNow = fromIssues ? true : isPublic;
  // capture eligibility follows visibility: a private segment can't capture
  const captureNow = capture && publicNow;

  const save = async () => {
    const fellBack = await issuesStore.saveSegment({
      id: segment?.id,
      name: name.trim() || t('Untitled segment'),
      isPublic: publicNow,
      filters: [...searchStore.instance.filters] as any,
      active: captureNow,
      instructions: instructions.trim() || undefined,
    });
    if (fellBack)
      toast.info(
        t('No active segments left — capture switched to full traffic.'),
      );
    onSaved?.();
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      title={
        readOnly
          ? `${segment?.name} — ${t('by')} ${segment?.createdBy}`
          : segment
            ? t('Edit segment')
            : t('New segment')
      }
      styles={{ wrapper: { width: 560 }, footer: { padding: '12px 24px' } }}
      footer={
        readOnly ? (
          <div className="flex items-center justify-end">
            <Button onClick={onClose}>{t('Close')}</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <Button type="text" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="primary" icon={<Check size={15} />} onClick={save}>
              {segment ? t('Save segment') : t('Create segment')}
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium color-gray-darkest">
            {t('Name')}
          </span>
          <Input
            autoFocus={!segment}
            placeholder={t('e.g. Billing & checkout')}
            value={name}
            maxLength={60}
            disabled={readOnly}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {fromIssues ? (
          <div className="flex items-center gap-1.5 text-xs -mt-2 color-gray-medium">
            <Users size={13} />
            {t('Team-visible — anyone on the team can manage its capture.')}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium color-gray-darkest">
              {t('Visibility')}
            </span>
            <Segmented
              value={isPublic ? 'team' : 'private'}
              disabled={readOnly}
              onChange={(v) => setIsPublic(v === 'team')}
              options={[
                {
                  value: 'team',
                  label: (
                    <span className="flex items-center gap-1.5 px-1">
                      <Users size={13} /> {t('Team')}
                    </span>
                  ),
                },
                {
                  value: 'private',
                  label: (
                    <span className="flex items-center gap-1.5 px-1">
                      <Lock size={13} /> {t('Private')}
                    </span>
                  ),
                },
              ]}
              className="self-start"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          {/* <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium color-gray-darkest">
              {t('Issues Agent')}
            </span>
            <Tooltip
              title={t(
                'The agent reviews sessions matching this segment and reports what it finds on the Issues page. Anyone on the team can switch it off.',
              )}
            >
              <span className="flex items-center cursor-help color-gray-medium">
                <Info size={13} />
              </span>
            </Tooltip>
          </div> */}
          {/* <div className="flex items-center gap-2">
            <Switch
              size="small"
              checked={captureNow}
              disabled={readOnly || !publicNow}
              onChange={setCapture}
              aria-label={t('Issues agent')}
            />
            <span className="text-sm color-gray-darkest">
              {t('Identify issues in this segment')}
            </span>
          </div> */}
          {!publicNow && (
            <span className="text-xs color-gray-medium">
              {t('Private — make it team-visible to enable the agent.')}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium color-gray-darkest">
              {fromIssues ? t('What to capture') : t('Conditions')}
            </span>
            <Tooltip
              title={t(
                'Define the portion of traffic with the same events and filters as the Sessions search. In segment capture, the agent records only sessions matching active segments.',
              )}
            >
              <span className="flex items-center cursor-help color-gray-medium">
                <Info size={13} />
              </span>
            </Tooltip>
          </div>
          <div
            className={readOnly ? 'pointer-events-none opacity-60' : undefined}
          >
            <SessionFilters />
          </div>
        </div>

        {/* <Alert
          type="info"
          showIcon
          className="border-transparent rounded-lg"
          title={
            narrowed
              ? t('The agent will analyse the sessions matching this segment.')
              : t(
                  'Add events or filters to narrow the segment — right now it matches all traffic.',
                )
          }
        /> */}

        {/* {showInstructions ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium color-gray-darkest">
              {t('Instructions')}{' '}
              <span className="font-normal color-gray-medium">
                {t('(optional)')}
              </span>
            </span>
            <Input.TextArea
              rows={3}
              maxLength={500}
              autoFocus={!readOnly && !segment?.instructions}
              disabled={readOnly}
              placeholder={t(
                'Extra context for the agent — e.g. "pay special attention to coupon and card-validation errors"',
              )}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
        ) : (
          !readOnly && (
            <Button
              type="link"
              size="small"
              icon={<Plus size={14} />}
              onClick={() => setShowInstructions(true)}
              className="self-start px-0!"
            >
              {t('Add instructions')}
            </Button>
          )
        )} */}
      </div>
    </Drawer>
  );
}

export default observer(SegmentDrawer);
