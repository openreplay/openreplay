import { App } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

/* Confirm-dialog hook. Rendered through App.useApp()'s modal, NOT the static
   Modal.confirm, so it inherits the app theme.

   A local Issues-side subset (delete only); kai-testing-ui carries a richer
   `confirms` for the Tests surface. On merge, repoint imports if consolidated. */
export function useConfirms() {
  const { modal } = App.useApp();
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
    modal.confirm({
      icon: null,
      width: 520,
      title: t('Delete this {{what}}?', { what }),
      content: (
        <p className="mb-0" style={{ color: 'var(--color-gray-dark)' }}>
          {t('“{{name}}” will be removed.', { name })} {consequence}
        </p>
      ),
      okText: t('Delete'),
      okButtonProps: { danger: true },
      cancelText: t('Cancel'),
      onOk,
    });

  return { confirmDelete };
}
