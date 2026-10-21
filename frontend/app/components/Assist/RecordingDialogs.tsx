import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { RenameDialog } from '@/ui/overlays/RenameDialog';
import { useToast } from '@/ui/overlays/toast';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import type { IRecord } from 'App/services/RecordingsService';

/** Rename and Delete for a recorded call, from its row or from its player. */
function RecordingDialogs({
  renaming,
  deleting,
  onClose,
}: {
  renaming: IRecord | null;
  deleting: IRecord | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { recordingsStore } = useStore();

  return (
    <>
      <RenameDialog
        open={renaming != null}
        title={t('Rename recording')}
        value={renaming?.name ?? ''}
        onCancel={onClose}
        onOk={(name) => {
          const target = renaming;
          onClose();
          if (!target) return;
          recordingsStore
            .updateRecordingName(target.recordId, name)
            .then(() => {
              void recordingsStore.fetchRecordings();
              if (recordingsStore.openRecord?.recordId === target.recordId)
                recordingsStore.openRecording({ ...target, name });
              toast.success(t('Recording name updated'));
            })
            .catch(() => toast.error(t("Couldn't update recording name")));
        }}
      />
      <ConfirmDialog
        open={deleting != null}
        title={t('Delete this recording?')}
        okText={t('Delete')}
        danger
        onCancel={onClose}
        onOk={() => {
          const target = deleting;
          onClose();
          if (!target) return;
          recordingsStore
            .deleteRecording(target.recordId)
            .then(() => {
              recordingsStore.setRecordings(
                recordingsStore.recordings.filter(
                  (rec) => rec.recordId !== target.recordId,
                ),
                recordingsStore.total - 1,
              );
              void recordingsStore.fetchRecordings();
              if (recordingsStore.openRecord?.recordId === target.recordId)
                recordingsStore.openRecording(null);
              toast.success(t('Recording deleted'));
            })
            .catch(() => toast.error(t("Couldn't delete recording")));
        }}
      >
        {t(
          '{{name}} is deleted for everyone on the team. The co-browsing session it came from is not affected.',
          { name: deleting?.name },
        )}
      </ConfirmDialog>
    </>
  );
}

export default observer(RecordingDialogs);
