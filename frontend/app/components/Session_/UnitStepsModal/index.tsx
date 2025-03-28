import React from 'react';
import { TYPES } from 'App/types/session/event';
import { CodeBlock, Icon } from 'UI';
import { Select, Radio, Checkbox } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { PlayerContext } from 'Components/Session/playerContext';
import { X } from 'lucide-react';
import { puppeteerEvents, cypressEvents, playWrightEvents } from './utils';
import { useTranslation } from 'react-i18next';

interface Props {
  onClose: () => void;
}

const defaultFrameworkKey = '__$defaultFrameworkKey$__';
export const getDefaultFramework = () => {
  const stored = localStorage.getItem(defaultFrameworkKey);
  return stored ?? 'cypress';
}
export const frameworkIcons = {
  cypress: 'cypress',
  puppeteer: 'puppeteer',
  playwright: 'pwright',
}
function UnitStepsModal({ onClose }: Props) {
  const { t } = useTranslation();
  const { sessionStore, uiPlayerStore } = useStore();
  const { store, player } = React.useContext(PlayerContext);
  const [eventStr, setEventStr] = React.useState('');
  const [mode, setMode] = React.useState('events');
  const [activeFramework, setActiveFramework] = React.useState(getDefaultFramework);
  const events = React.useMemo(() => {
    if (!uiPlayerStore.exportEventsSelection.enabled) {
      return sessionStore.current.events;
    } else {
      return sessionStore.current.events.filter((ev) => {
        return (
          ev.time >= uiPlayerStore.exportEventsSelection.startTs &&
          ev.time <= uiPlayerStore.exportEventsSelection.endTs
        );
      });
    }
  }, [
    sessionStore.current.events,
    uiPlayerStore.exportEventsSelection.enabled,
    uiPlayerStore.exportEventsSelection.startTs,
    uiPlayerStore.exportEventsSelection.endTs,
  ]);
  const { tabNames, currentTab } = store.get();

  React.useEffect(() => {
    player.pause();
    return () => {
      uiPlayerStore.toggleExportEventsSelection({ enabled: false });
    };
  }, []);

  React.useEffect(() => {
    const userEventTypes = [TYPES.LOCATION, TYPES.CLICK, TYPES.INPUT];

    const collections = {
      puppeteer: puppeteerEvents,
      cypress: cypressEvents,
      playwright: playWrightEvents,
    };

    // @ts-ignore
    const usedCollection = collections[activeFramework];

    let finalScript = '';
    if (mode === 'test') {
      const pageName = tabNames[currentTab] ?? 'Test Name';
      const firstUrl =
        events.find((ev) => ev.type === TYPES.LOCATION)?.url ?? 'page';
      finalScript += usedCollection.testIntro(pageName, firstUrl);
      finalScript += '\n';
    }
    events.forEach((ev) => {
      if (userEventTypes.includes(ev.type)) {
        if (mode === 'test') {
          finalScript += '    ';
        }
        finalScript += usedCollection[ev.type](ev);
        finalScript += '\n';
      }
    });
    if (mode === 'test') {
      finalScript += usedCollection.testOutro();
    }
    setEventStr(finalScript);
  }, [events, activeFramework, mode]);

  const enableZoom = () => {
    const time = store.get().time;
    const endTime = store.get().endTime;
    const closestEvent = sessionStore.current.events.reduce((prev, curr) => {
      return Math.abs(curr.time - time) < Math.abs(prev.time - time)
        ? curr
        : prev;
    });
    const closestInd = sessionStore.current.events.indexOf(closestEvent);
    if (closestEvent) {
      const beforeCenter = closestInd > 4 ? closestInd - 4 : null;
      const afterCenter =
        closestInd < sessionStore.current.events.length - 4
          ? closestInd + 4
          : null;

      uiPlayerStore.toggleExportEventsSelection({
        enabled: true,
        range: [
          beforeCenter ? sessionStore.current.events[beforeCenter].time : 0,
          afterCenter ? sessionStore.current.events[afterCenter].time : endTime,
        ],
      });
    } else {
      const distance = Math.max(endTime / 40, 2500);

      uiPlayerStore.toggleExportEventsSelection({
        enabled: true,
        range: [
          Math.max(time - distance, 0),
          Math.min(time + distance, endTime),
        ],
      });
    }
  };

  const toggleZoom = (enabled?: boolean) => {
    if (enabled) {
      enableZoom();
    } else {
      uiPlayerStore.toggleExportEventsSelection({ enabled: false });
    }
  };

  const changeFramework = (framework: string) => {
    localStorage.setItem(defaultFrameworkKey, framework);
    setActiveFramework(framework);
  }

  return (
    <div
      className={'bg-white h-screen w-full flex flex-col items-start gap-2 p-4'}
      style={{ marginTop: -50 }}
    >
      <div className={'flex items-center justify-between w-full'}>
        <div className={'font-semibold text-xl'}>{t('Copy Events')}</div>
        <div className={'cursor-pointer'} onClick={onClose}>
          <X size={18} />
        </div>
      </div>
      <Select
        className={'w-full'}
        options={[
          {
            label: (
              <div className={'flex items-center gap-2'}>
                <Icon name={'cypress'} size={18} />
                <div>{t('Cypress')}</div>
              </div>
            ),
            value: 'cypress',
          },
          {
            label: (
              <div className={'flex items-center gap-2'}>
                <Icon name={'puppeteer'} size={18} />
                <div>{t('Puppeteer')}</div>
              </div>
            ),
            value: 'puppeteer',
          },
          {
            label: (
              <div className={'flex items-center gap-2'}>
                <Icon name={'pwright'} size={18} />
                <div>{t('Playwright')}</div>
              </div>
            ),
            value: 'playwright',
          },
        ]}
        value={activeFramework}
        onChange={changeFramework}
      />
      <Radio.Group
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className={'w-full'}
      >
        <Radio value={'events'}>{t('Events Only')}</Radio>
        <Radio value={'test'}>{t('Complete Test')}</Radio>
      </Radio.Group>
      <Checkbox
        value={uiPlayerStore.exportEventsSelection.enabled}
        onChange={(e) => toggleZoom(e.target.checked)}
      >
        {t('Select events on the timeline')}
      </Checkbox>
      <div className={'w-full'}>
        <CodeBlock
          width={340}
          height={'calc(100vh - 174px)'}
          extra={`${events.length} Events`}
          copy
          code={eventStr}
          language={'javascript'}
        />
      </div>
    </div>
  );
}

export default observer(UnitStepsModal);
