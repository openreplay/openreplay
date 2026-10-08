import { JSONTree } from '@/ui/data/JSONTree';
import { DrawerHeader, Section } from '@/ui/overlays/EntityDrawer';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';

const parse = (raw: any) => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

/** One GraphQL operation: its variables and response. */
function GraphQLDetailsModal({ resource }: { resource: any }) {
  const { t } = useTranslation();
  const { hideModal } = useModal();
  const { variables, response, duration, operationKind, operationName } =
    resource;
  const vars = parse(variables);
  const res = parse(response);

  return (
    <div className="m-drawer__pane">
      <header className="m-drawer__head">
        <DrawerHeader
          eyebrow={operationKind}
          title={operationName || t('GraphQL operation')}
          meta={
            duration
              ? t('{{ms}} ms', { ms: parseInt(duration, 10) })
              : undefined
          }
          onClose={hideModal}
        />
      </header>
      <div className="m-drawer__body">
        <Section title={t('Variables')}>
          {vars === undefined ? (
            <p className="m-mono text-content-primary">{variables}</p>
          ) : (
            <JSONTree src={vars} />
          )}
        </Section>
        <Section title={t('Response')}>
          {res === undefined ? (
            <p className="m-mono text-content-primary">{response}</p>
          ) : (
            <JSONTree src={res} />
          )}
        </Section>
      </div>
    </div>
  );
}

export default GraphQLDetailsModal;
