import { Button, Input, Modal, Tooltip } from 'antd';
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
    <div className="flex flex-col gap-3">
      <Input.TextArea
        autoFocus={autoFocus}
        rows={3}
        maxLength={300}
        placeholder={t(
          'e.g. Anything that stops someone paying: declined cards, failed charges, or a payment form that rejects valid details.',
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="text-xs color-gray-medium">{caption}</span>
    </div>
  );
}

/* The critical dialog: describe what's critical rather than just flagging it.
   Four states drive title/footer — undescribed, mine, team, muted. */
export default observer(function CriticalDialog({
  issueId,
  issueHead,
  onClose,
}: {
  /** null closes it */
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

  React.useEffect(() => {
    if (open) setDesc(authoring ? issueHead : '');
  }, [open, issueHead, authoring]);

  const removeFromCritical = () => {
    if (issueId == null) return;
    // no reason prompt on this path — that's what NotCriticalDialog is for
    issuesStore.setNotCriticalForMe(issueId);
    onClose();
  };
  const save = () => {
    if (issueId == null || !desc.trim()) return;
    issuesStore.addCriticalRule(desc.trim(), issueId);
    onClose();
  };

  const rules = state === 'muted' ? underlying : matched;

  return (
    <Modal
      title={
        state === 'muted'
          ? t('Not critical for you')
          : state === 'undescribed'
            ? t('What makes this critical?')
            : t('Why this is critical')
      }
      open={open}
      onCancel={onClose}
      onOk={save}
      okText={t('Save')}
      okButtonProps={{ disabled: !desc.trim() }}
      footer={(_, { OkBtn, CancelBtn }) => (
        <div className="flex items-center">
          {state === 'mine' && (
            <Tooltip
              placement="topLeft"
              title={t('Only this issue. Your description stays.')}
            >
              <Button type="text" danger onClick={removeFromCritical}>
                {t('Not critical for me')}
              </Button>
            </Tooltip>
          )}
          {state === 'muted' && (
            <Button
              type="text"
              onClick={() => {
                if (issueId != null) issuesStore.restoreCritical(issueId);
                onClose();
              }}
            >
              {t('Show as critical again')}
            </Button>
          )}
          <span className="ml-auto flex items-center gap-2">
            <CancelBtn />
            {authoring && <OkBtn />}
          </span>
        </div>
      )}
      cancelText={authoring ? t('Cancel') : t('Close')}
    >
      <p className="mb-3 color-gray-dark">
        {state === 'muted'
          ? t(
              'You removed “{{head}}” from your critical list. It was flagged by:',
              { head: issueHead },
            )
          : `“${issueHead}”`}
      </p>

      {rules.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {rules.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-2.5 rounded-lg border p-3"
            >
              <AlertTriangle
                size={15}
                className="mt-0.5 shrink-0"
                style={{
                  color:
                    state === 'muted'
                      ? 'var(--color-gray-medium)'
                      : 'var(--color-red)',
                }}
              />
              <div className="flex flex-col gap-0.5">
                <span>{r.description}</span>
                <span className="text-sm color-gray-medium">
                  {r.mine
                    ? t('Your description')
                    : t('{{name}}’s description', { name: r.createdBy })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {authoring && (
        <div className="flex flex-col gap-3">
          <span className="color-gray-dark">
            {matched.length
              ? t(
                  'Describe it in your own words to make it critical for you too.',
                )
              : t(
                  'Describe what makes issues like this critical. The agent reads your description and flags what matches, so this is a rule, not a one-off.',
                )}
          </span>
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
