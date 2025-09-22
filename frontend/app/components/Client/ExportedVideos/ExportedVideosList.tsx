import React, { useEffect } from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Loader, Pagination, NoContent, PageTitle } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { useTranslation } from 'react-i18next';
import { session } from 'App/routes';
import SiteDropdown from 'Shared/SiteDropdown';
import ExportedVideo from './ExportedVideoRow';

function ExportedVideosList() {
  const { t } = useTranslation();
  const { recordingsStore, projectsStore } = useStore();
  const siteId = projectsStore.siteId;
  const loading = recordingsStore.loading;
  const list = recordingsStore.exportedVideosList;

  useEffect(() => {
    recordingsStore.getRecordings();
  }, [siteId]);

  const onSiteChange = ({ value }) => {
    projectsStore.setSiteId(value.value);
  };

  const onRecOpen = async (sessionId: string) => {
    const fileURL = await recordingsStore.getRecordingLink(sessionId)
    window.open(fileURL, '_blank');
  };

  const onSessionOpen = (sessionId: string) => {
    console.log(window.env)
    const win = window.open(
      `https://${window.env.ORIGIN}/${projectsStore.activeSiteId}${session(sessionId)}`,
      '_blank',
    );
    win?.focus();
  };

  const onDelete = (sessionId: string) => {
    void recordingsStore.deleteSessionRecording(sessionId)
  }
  return (
    <div className="bg-white rounded-lg  border shadow-sm">
      <div className="flex items-center gap-4">
        <PageTitle
          title={<div className="py-4 pl-4">{t('Exported Videos')}</div>}
        />
        <SiteDropdown value={siteId} onChange={onSiteChange} />
      </div>
      <div className="grid grid-cols-12 py-2 px-4 font-medium">
        <div className="col-span-3">{t('Session')}</div>
        <div className="col-span-3">{t('Date')}</div>
        <div className="col-span-2">{t('User')}</div>
        <div className="col-span-2">{t('Status')}</div>
        <div className="col-span-2 ml-auto">{/* actions */}</div>
      </div>
      <Loader loading={loading}>
        <NoContent
          title={
            <div className="flex flex-col items-center justify-center">
              <AnimatedSVG name={ICONS.NO_AUDIT_TRAIL} size={60} />
              <div className="text-center my-4">
                {t('Exports list is empty for now.')}
              </div>
            </div>
          }
          size="small"
          show={list.length === 0}
        >
          {list.map((item, index) => (
            <ExportedVideo
              item={item}
              key={index}
              onRecOpen={onRecOpen}
              onSessionOpen={onSessionOpen}
              onDelete={onDelete}
            />
          ))}

          <div className="w-full flex items-center justify-end py-10">
            <Pagination
              page={recordingsStore.page}
              total={recordingsStore.total}
              onPageChange={(page) => recordingsStore.updatePage(page)}
              limit={10}
              debounceRequest={200}
            />
          </div>
        </NoContent>
      </Loader>
    </div>
  );
}

export default observer(ExportedVideosList);
