import React from 'react'
import DocCard from "App/components/shared/DocCard";
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react'
import { CopyButton } from "UI";

export function CollabCard({ showUserModal }: { showUserModal: () => void }) {
  const { t } = useTranslation();

  return (
    <DocCard title={t('Need help from team member?')}>
      <div className={'text-main cursor-pointer flex items-center gap-2'} onClick={showUserModal}>
        <Mail size={14} />
        <span>
          {t('Invite and Collaborate')}
        </span>
      </div>
    </DocCard>
  )
}

export function ProjectKeyCard({ projectKey }: { projectKey: string }) {
  const { t } = useTranslation();
  return (
    <DocCard title={t('Project Key')}>
      <div className="p-2 rounded bg-white flex justify-between items-center">
        <div className={'font-mono'}>{projectKey}</div>
        <CopyButton content={projectKey} className={'capitalize font-medium text-neutral-400'} />
      </div>
    </DocCard>
  )
}