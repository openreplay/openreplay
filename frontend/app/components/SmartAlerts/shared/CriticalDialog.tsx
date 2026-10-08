import { Button } from '@/ui/actions/button';
import { Chip } from '@/ui/data/Chip';
import { Textarea } from '@/ui/inputs/textarea';
import '@/ui/overlays/dialogs.css';
import { Modal } from '@/ui/overlays/modal';
import { Tooltip } from '@/ui/overlays/tooltip';
import { AlertTriangle } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

/** The description field + its expectation caption; shared with Preferences. */
export function CriticalRuleFields({
  value,
  onChange,
  caption,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  caption: string;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        autoFocus={autoFocus}
        rows={3}
        maxLength={300}
        placeholder={t(
          'e.g. Anything that stops someone paying: declined cards, failed charges, or a payment form that rejects valid details.',
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="text-xs text-content-muted">{caption}</span>
    </div>
  );
}

/* Describe what's critical rather than just flagging it.
   Four states drive title and footer: undescribed, mine, team, muted. */
export default observer(function CriticalDialog({
  issueId,
  issueHead,
  onClose,
}: {
  issueId: string | null;
  issueHead: string;
  onClose: () => void;
}) {
  const { issuesStore } = useStore();
  const { t } = useTranslation();
  const [desc, setDesc] = React.useState('');

  const open = issueId != null;
  const muted = open && issuesStore.notCritical[issueId] != null;
  const matched = open ? issuesStore.matchedRules(issueId) : [];
  const hasMine = matched.some((r) => r.mine);
  const underlying = open ? issuesStore.rulesFor(issueId) : [];
  const state: 'undescribed' | 'mine' | 'team' | 'muted' = muted
    ? 'muted'
    : !matched.length
      ? 'undescribed'
      : hasMine
        ? 'mine'
        : 'team';
  const authoring = state === 'undescribed' || state === 'team';

  // seeded when the dialog opens; a store refresh while it's open must not
  // overwrite what the user is typing
  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    if (open && !wasOpen.current) setDesc(authoring ? issueHead : '');
    wasOpen.current = open;
  }, [open, issueHead, authoring]);

  const save = () => {
    if (issueId == null || !desc.trim()) return;
    issuesStore.addCriticalRule(desc.trim(), issueId);
    onClose();
  };
  const rules = state === 'muted' ? underlying : matched;

  return (
    <Modal
      width={520}
      title={
        state === 'muted'
          ? t('Not critical for you')
          : state === 'undescribed'
            ? t('What makes this critical?')
            : t('Why this is critical')
      }
      open={open}
      onCancel={onClose}
      footer={
        <div className="m-dlg__foot w-full">
          {state === 'mine' && (
            <Tooltip title={t('Only this issue. Your description stays.')}>
              <span>
                <Button
                  variant="danger-outline"
                  onClick={() => {
                    if (issueId != null)
                      issuesStore.setNotCriticalForMe(issueId);
                    onClose();
                  }}
                >
                  {t('Not critical for me')}
                </Button>
              </span>
            </Tooltip>
          )}
          {state === 'muted' && (
            <Button
              onClick={() => {
                if (issueId != null) issuesStore.restoreCritical(issueId);
                onClose();
              }}
            >
              {t('Show as critical again')}
            </Button>
          )}
          <span className="ml-auto flex items-center gap-2">
            <Button variant="subtle" onClick={onClose}>
              {authoring ? t('Cancel') : t('Close')}
            </Button>
            {authoring && (
              <Button variant="primary" disabled={!desc.trim()} onClick={save}>
                {t('Save')}
              </Button>
            )}
          </span>
        </div>
      }
    >
      <p className="m-dlg__lede">
        {state === 'muted' ? (
          <>
            {t('You removed')}{' '}
            <span className="m-dlg__subject">{issueHead}</span>{' '}
            {t('from your critical list. It was flagged by:')}
          </>
        ) : (
          <span className="m-dlg__subject">{issueHead}</span>
        )}
      </p>

      {rules.length > 0 && (
        <div className="m-dlg__matched">
          {rules.map((r) => (
            <div
              key={r.id}
              className={`m-dlg__rule${state === 'muted' ? '' : ' is-matched'}`}
            >
              <AlertTriangle
                size={13}
                className="m-dlg__rule-icon"
                aria-hidden="true"
              />
              <span className="m-dlg__rule-text">{r.description}</span>
              <Chip tone={r.mine ? 'danger' : 'neutral'}>
                {r.mine ? t('Yours') : r.createdBy}
              </Chip>
            </div>
          ))}
        </div>
      )}

      {authoring && (
        <div className="flex flex-col gap-3">
          <p className="m-dlg__none">
            {matched.length
              ? t(
                  'Describe it in your own words to make it critical for you too.',
                )
              : t(
                  'Describe what makes issues like this critical. The agent reads your description and flags what matches, so this is a rule, not a one-off.',
                )}
          </p>
          <CriticalRuleFields
            autoFocus
            value={desc}
            onChange={setDesc}
            caption={t(
              'This issue is flagged straight away. Anything else it matches is flagged as the agent reviews new sessions.',
            )}
          />
        </div>
      )}
    </Modal>
  );
});
