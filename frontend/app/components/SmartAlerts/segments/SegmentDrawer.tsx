import { Button } from '@/ui/actions/button';
import { Switch } from '@/ui/inputs/switch';
import { Textarea } from '@/ui/inputs/textarea';
import { EntityDrawer, Section } from '@/ui/overlays/EntityDrawer';
import { Modal } from '@/ui/overlays/modal';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import FilterItem from 'App/mstore/types/filterItem';
import { agentIssuesEnabled } from 'App/utils/split-utils';

import {
  FilterBar,
  buildFilterEditor,
  useCatalogue,
  useLocalTarget,
} from 'Shared/FilterEditor';

import type { SavedSegment } from '../api';
import './segment-drawer.css';

interface Props {
  open: boolean;
  /** editing an existing segment; null = creating a new one */
  segment: SavedSegment | null;
  /** where the drawer was opened from — Issues forces team visibility */
  source: 'issues' | 'dm';
  onClose: () => void;
  onSaved?: () => void;
}

function SegmentDrawer({ open, segment, source, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const { issuesStore } = useStore();
  const fromIssues = source === 'issues';
  const showAgent = agentIssuesEnabled() && issuesStore.agentAvailable === true;
  const readOnly = Boolean(segment && !segment.mine);
  const entries = useCatalogue(['sessions']).filter(
    (e) => e.category !== 'segments',
  );
  const target = useLocalTarget();
  const editor = buildFilterEditor(target);

  const [name, setName] = React.useState('');
  const [instructions, setInstructions] = React.useState('');
  const [isPublic, setIsPublic] = React.useState(true);
  const [capture, setCapture] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(segment?.name ?? '');
    setInstructions(segment?.instructions ?? '');
    setIsPublic(fromIssues ? true : (segment?.isPublic ?? true));
    setCapture(segment?.active ?? fromIssues);
    target.reset(segment ? ([...segment.filters] as any[]) : []);
  }, [open, segment]);

  const publicNow = fromIssues ? true : isPublic;
  const captureNow = capture && publicNow;
  const hasRules = target.filters.length > 0;
  const named = name.trim().length > 0;

  const why = readOnly
    ? t('This is {{name}}’s segment.', { name: segment?.createdBy })
    : !named
      ? t('Give it a name first')
      : undefined;

  const save = async () => {
    setSaving(true);
    let fellBack: boolean;
    try {
      fellBack = await issuesStore.saveSegment({
        id: segment?.id,
        name: name.trim(),
        isPublic: publicNow,
        filters: target.filters.map((f) => new FilterItem(f as any)),
        active: captureNow,
        instructions: instructions.trim() || undefined,
      });
    } catch {
      toast.error(t('Could not save the segment'));
      return;
    } finally {
      setSaving(false);
    }
    if (fellBack)
      toast.info(
        t('No active segments left — capture switched to full traffic.'),
      );
    onSaved?.();
    onClose();
  };

  return (
    <>
      <EntityDrawer
        size="wide"
        open={open}
        onClose={onClose}
        title={name}
        autoEditTitle={!segment}
        namePlaceholder={t('Name this segment')}
        onTitleChange={readOnly ? undefined : setName}
        eyebrow={
          !segment
            ? t('Segment · New')
            : segment.mine
              ? t('Segment · Yours')
              : t('Segment · {{name}}', { name: segment.createdBy })
        }
        meta={
          segment && (
            <span>
              {segment.isPublic ? t('Shared with the team') : t('Only you')}
            </span>
          )
        }
        footer={
          <div className="m-sd__foot">
            {segment && segment.mine ? (
              <Button
                variant="danger-subtle"
                onClick={() => setConfirming(true)}
              >
                {t('Delete')}
              </Button>
            ) : (
              <span />
            )}
            <span className="m-sd__foot-right">
              <Button onClick={onClose}>
                {readOnly ? t('Close') : t('Cancel')}
              </Button>
              {!readOnly && (
                <Tooltip title={why}>
                  <span>
                    <Button
                      variant="primary"
                      disabled={why != null}
                      loading={saving}
                      onClick={save}
                    >
                      {segment ? t('Save changes') : t('Create segment')}
                    </Button>
                  </span>
                </Tooltip>
              )}
            </span>
          </div>
        }
      >
        <Section
          title={fromIssues ? t('What to capture') : t('Rules')}
          hint={t(
            'A segment is a saved search. These are the same rows the sessions filter uses, and they behave the same way.',
          )}
        >
          <div className={readOnly ? 'pointer-events-none opacity-60' : ''}>
            <FilterBar
              variant="panel"
              editor={editor}
              entries={entries}
              orderLocked
            />
          </div>
        </Section>

        {fromIssues ? (
          <Section
            title={t('Sharing')}
            hint={t(
              'Team-visible — anyone on the team can manage its capture.',
            )}
          />
        ) : (
          <Section
            title={t('Sharing')}
            hint={t(
              'A shared segment appears in everyone’s filter picker and in their segments list.',
            )}
          >
            <label className="m-sd__row">
              <Switch
                checked={isPublic}
                disabled={readOnly}
                onCheckedChange={setIsPublic}
              />
              <span>{t('Share with the team')}</span>
            </label>
          </Section>
        )}

        {showAgent && (
          <Section
            title={t('Issues Agent')}
            hint={t(
              'The agent reviews sessions matching this segment and reports what it finds on the Issues page. Anyone on the team can switch it off.',
            )}
          >
            <label className="m-sd__row">
              <Switch
                checked={captureNow}
                disabled={readOnly || !publicNow}
                onCheckedChange={setCapture}
              />
              <span>{t('Identify issues in this segment')}</span>
            </label>
            {!publicNow && (
              <p className="m-sd__note">
                {t('Private — make it team-visible to enable the agent.')}
              </p>
            )}
            {captureNow && !hasRules && (
              <p className="m-sd__note">
                {t(
                  'Add events or filters to narrow the segment — right now it matches all traffic.',
                )}
              </p>
            )}
            <Textarea
              rows={3}
              maxLength={500}
              disabled={readOnly}
              placeholder={t(
                'Extra context for the agent — e.g. "pay special attention to coupon and card-validation errors"',
              )}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </Section>
        )}
      </EntityDrawer>

      <Modal
        title={t('Delete “{{name}}”?', { name: segment?.name })}
        open={confirming}
        onCancel={() => setConfirming(false)}
        okText={t('Delete')}
        okVariant="danger"
        onOk={async () => {
          setConfirming(false);
          if (!segment) return;
          await issuesStore.deleteSegment(segment.id);
          onSaved?.();
          onClose();
        }}
      >
        <p className="text-sm text-content-secondary">
          {t(
            'The search is deleted. The sessions it describes are not affected.',
          )}
        </p>
      </Modal>
    </>
  );
}

export default observer(SegmentDrawer);
