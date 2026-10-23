import { CopyButton } from '@/ui/actions/CopyButton';
import { Button } from '@/ui/actions/button';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { Mark, type MarkKind } from '@/ui/illustrations/Mark';
import { PageCard } from '@/ui/layout/PageCard';
import { toast } from '@/ui/overlays/toast';
import { RotateCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import './session-not-found.css';

/**
 * A session link that resolves to nothing. The API only says "not found", so
 * the page names the link and lists the reasons, never picking one.
 */
export default function SessionNotFound({
  id,
  onBack,
  onRetry,
}: {
  id: string;
  onBack: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const reasons: { mark: MarkKind; title: string; detail: string }[] = [
    {
      mark: 'calendar',
      title: t('It is older than the project keeps sessions'),
      detail: t('Sessions past your plan’s retention are deleted.'),
    },
    {
      mark: 'layers',
      title: t('It was recorded in another project'),
      detail: t('Pick that project in the menu, then open the link again.'),
    },
    {
      mark: 'noMatch',
      title: t('The link is incomplete or wrong'),
      detail: t('Copy it again from where it was shared.'),
    },
  ];

  return (
    <PageCard
      back={{ label: t('Sessions'), onClick: onBack }}
      title={t('Session not found')}
      meta={
        <span className="m-snf__id">
          <span className="m-snf__id-value">{id}</span>
          <CopyButton
            variant="ghost"
            size="xs"
            text={id}
            label={t('Copy session id')}
            onCopied={() => toast.success(t('Session id copied'))}
          />
        </span>
      }
    >
      <EmptyState
        className="m-snf"
        state="session-not-found"
        title={t('This session is not here')}
        hint={t('The link points to a session this project cannot open.')}
      >
        <div className="m-snf__actions">
          <Button variant="primary" onClick={onBack}>
            {t('Show all sessions')}
          </Button>
          <Button variant="secondary" onClick={onRetry}>
            <RotateCw size={14} aria-hidden="true" />
            {t('Try again')}
          </Button>
        </div>
        <ul className="m-snf__reasons">
          {reasons.map((r) => (
            <li key={r.mark} className="m-snf__reason">
              <Mark kind={r.mark} width={28} />
              <span className="m-snf__reason-text">
                <span className="m-snf__reason-title">{r.title}</span>
                <span className="m-snf__reason-detail">{r.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </EmptyState>
    </PageCard>
  );
}
