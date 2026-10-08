import { confirm } from '@/ui/overlays/confirm';
import { useTranslation } from 'react-i18next';

/* Confirm-dialog hook over the shared (kit-modal) confirm. A local Issues-side
   subset (delete only). */
export function useConfirms() {
  const { t } = useTranslation();

  const confirmDelete = ({
    what,
    name,
    consequence,
    onOk,
  }: {
    /** the noun, e.g. "description" / "tag" */
    what: string;
    /** the subject, quoted in the body */
    name: string;
    /** one line on what removing it does */
    consequence: string;
    onOk: () => void;
  }) =>
    void confirm({
      header: t('Delete this {{what}}?', { what }),
      confirmation: `${t('“{{name}}” will be removed.', { name })} ${consequence}`,
      confirmButton: t('Delete'),
      cancelButton: t('Cancel'),
      danger: true,
    }).then((ok: boolean) => {
      if (ok) onOk();
    });

  return { confirmDelete };
}
