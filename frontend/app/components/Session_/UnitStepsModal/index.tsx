import React from 'react';
import { TYPES } from 'App/types/session/event';
import { CodeBlock, Icon } from 'UI';
import { Select, Radio } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { PlayerContext } from '../../Session/playerContext';
import { X } from 'lucide-react';
import { puppeteerEvents, cypressEvents, playWrightEvents } from './utils';

interface Props {
  onClose: () => void;
}

function UnitStepsModal({ onClose }: Props) {
  const { sessionStore, uiPlayerStore } = useStore();
  const { store } = React.useContext(PlayerContext);
  const [eventStr, setEventStr] = React.useState('');
  const [mode, setMode] = React.useState('events');
  const [activeFramework, setActiveFramework] = React.useState('cypress');
  const events = sessionStore.current.events;
  const { tabNames, currentTab } = store.get();

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

  return (
    <div
      className={'bg-white h-screen w-full flex flex-col items-start gap-2 p-4'}
      style={{ marginTop: -50 }}
    >
      <div className={'flex items-center justify-between w-full'}>
        <div className={'font-semibold text-xl'}>Copy Events</div>
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
                <div>Cypress</div>
              </div>
            ),
            value: 'cypress',
          },
          {
            label: (
              <div className={'flex items-center gap-2'}>
                <Icon name={'puppeteer'} size={18} />
                <div>Puppeteer</div>
              </div>
            ),
            value: 'puppeteer',
          },
          {
            label: (
              <div className={'flex items-center gap-2'}>
                <Icon name={'pwright'} size={18} />
                <div>Playwright</div>
              </div>
            ),
            value: 'playwright',
          },
        ]}
        value={activeFramework}
        onChange={(value) => setActiveFramework(value)}
      />
      <Radio.Group
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className={'w-full'}
      >
        <Radio value={'events'}>Events Only</Radio>
        <Radio value={'test'}>Complete Test</Radio>
      </Radio.Group>
      <div className={'w-full'}>
        <CodeBlock
          width={241}
          height={'calc(100vh - 146px)'}
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
