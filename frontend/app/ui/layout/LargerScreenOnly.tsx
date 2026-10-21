import type { EmptyArtVariant } from '@/ui/feedback/EmptyArt';
import { EmptyState } from '@/ui/feedback/EmptyState';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useViewport } from './use-viewport';

/** At phone width, a surface that needs its full width says so in its place. */
export function LargerScreenOnly({
  what,
  art,
  children,
}: {
  /** the surface, as the start of a sentence: "Editing a card" */
  what: string;
  /** only where the note stands in for a whole page */
  art?: EmptyArtVariant;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  if (useViewport() !== 'phone') return <>{children}</>;
  return (
    <EmptyState
      art={art}
      title={t('Made for a larger screen')}
      hint={t('{{what}} needs the room. Open it on a computer or a tablet.', {
        what,
      })}
    />
  );
}
