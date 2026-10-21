import { CopyMarkdown } from '@/ui/actions/CopyMarkdown';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import {
  Bell,
  BellOff,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { CriticalFlag } from 'Components/SmartAlerts/shared/CriticalFlag';

import { type Issue, LinearIcon, impactLevel } from '../shared';

export const issueMarkdown = (issue: Issue, url: string) =>
  [
    `## ${issue.head}`,
    '',
    `- Impact: ${impactLevel(issue.impact)}`,
    issue.cat ? `- Category: ${issue.cat}` : null,
    `- Sessions affected: ${issue.impactedSessions}`,
    issue.journeyLabels.length
      ? `- Tags: ${issue.journeyLabels.join(', ')}`
      : null,
    '',
    issue.problem ? `### The problem\n\n${issue.problem}\n` : null,
    issue.fix ? `### Suggested fix\n\n${issue.fix}\n` : null,
    url,
  ]
    .filter((l) => l != null)
    .join('\n');

/** The issue's verbs: critical flag, ticket, copy, and the menu. */
function IssueActions({
  issue,
  onOpenCritical,
  onNotCritical,
  onRename,
  onHide,
}: {
  issue: Issue;
  onOpenCritical: () => void;
  onNotCritical: () => void;
  onRename: () => void;
  onHide: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { issuesStore, integrationsStore, projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;

  React.useEffect(() => {
    void integrationsStore.integrations.ensureIntegrations(siteId);
  }, [siteId]);
  const linear = integrationsStore.integrations.integratedServices.some(
    (int: any) => int.name === 'linear',
  );
  const ticket = issuesStore.tickets[issue.id];
  const muted = issuesStore.notCritical[issue.id] != null;
  const state = muted ? 'dismissed' : issuesStore.critState(issue.id);
  const matchedBy = issuesStore
    .matchedRules(issue.id)
    .find((r) => !r.mine)?.createdBy;

  const createTicket = async () => {
    const created = await issuesStore.createTicket(issue.id, 'linear');
    if (created) toast.success(t('Linear ticket created'));
    else toast.error(t('Failed to create the Linear ticket'));
  };

  return (
    <>
      <CriticalFlag
        state={state}
        matchedBy={matchedBy}
        onClick={onOpenCritical}
      />
      {ticket ? (
        <Button onClick={() => window.open(ticket.url, '_blank', 'noopener')}>
          <ExternalLink size={13} />
          {t('View ticket')}
        </Button>
      ) : (
        <Tooltip
          title={
            linear
              ? t('Create a Linear ticket')
              : t(
                  'Connect your Linear project to create tickets from OpenReplay',
                )
          }
        >
          <span>
            <IconButton
              icon={<LinearIcon size={15} />}
              label={t('Create a Linear ticket')}
              variant="primary"
              disabled={!linear || issuesStore.ticketPending === issue.id}
              onClick={() => void createTicket()}
            />
          </span>
        </Tooltip>
      )}
      <CopyMarkdown
        markdown={() => issueMarkdown(issue, window.location.href)}
        label={t('Copy the issue as markdown')}
        icon={<Copy size={15} />}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span>
            <IconButton
              icon={<MoreHorizontal size={15} />}
              label={t('Issue actions')}
              variant="ghost"
            />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItems
            items={[
              {
                key: 'rename',
                label: t('Rename'),
                icon: <Pencil size={13} />,
                onClick: onRename,
              },
              ...(state === 'mine' || state === 'team'
                ? [
                    {
                      key: 'drop',
                      label: t('Not critical for me'),
                      icon: <BellOff size={13} />,
                      onClick: onNotCritical,
                    },
                  ]
                : state === 'dismissed'
                  ? [
                      {
                        key: 'restore',
                        label: t('Show as critical again'),
                        icon: <Bell size={13} />,
                        onClick: () => issuesStore.restoreCritical(issue.id),
                      },
                    ]
                  : []),
              { key: 'd1', type: 'divider' as const },
              issue.hidden
                ? {
                    key: 'unhide',
                    label: t('Unhide'),
                    icon: <Eye size={13} />,
                    onClick: () => issuesStore.unhide(issue.id),
                  }
                : {
                    key: 'hide',
                    label: t('Hide'),
                    icon: <EyeOff size={13} />,
                    onClick: onHide,
                  },
            ]}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export default observer(IssueActions);
