import React from 'react';
import { TYPES, Input, Click, Location } from 'App/types/session/event';
import { CodeBlock, CopyButton } from 'UI';
import { Segmented } from 'antd';

interface Props {
  events: Input[] | Click[] | Location[];
  width: number;
  height: number;
}

function UnitStepsModal({ events, width, height }: Props) {
  const [eventStr, setEventStr] = React.useState('');
  const [activeFramework, setActiveFramework] = React.useState('puppeteer');

  React.useEffect(() => {
    const userEventTypes = [TYPES.LOCATION, TYPES.CLICK, TYPES.INPUT];
    const puppeteerEvents = {
      [TYPES.LOCATION]: (event: Location) => `await page.goto('${event.url}')`,
      [TYPES.CLICK]: (event: Click) =>
        `await page.locator('${
          event.selector.length ? event.selector : event.label
        }').click()`,
      [TYPES.INPUT]: (event: Input) =>
        `await page.locator('${event.label}').type('Test Input')`,
      screen: () =>
        `await page.setViewport({width: ${width}, height: ${height})`,
    };
    const cypressEvents = {
      [TYPES.LOCATION]: (event: Location) => `cy.visit('${event.url}')`,
      [TYPES.CLICK]: (event: Click) =>
        `cy.get('${
          event.selector.length ? event.selector : event.label
        }').click()`,
      [TYPES.INPUT]: (event: Input) =>
        `cy.get('${event.label}').type('Test Input')`,
      screen: () => `cy.viewport(${width}, ${height})`,
    };
    const playWrightEvents = {
      [TYPES.LOCATION]: (event: Location) => `await page.goto('${event.url}')`,
      [TYPES.CLICK]: (event: Click) =>
        event.selector.length
          ? `await page.locator('${event.selector}').click()`
          : `await page.getByText('${event.label}').click()`,
      [TYPES.INPUT]: (event: Input) =>
        `await page.getByLabel('${event.label}').fill('Test Input')`,
      screen: () =>
        `await page.setViewport({width: ${width}, height: ${height})`,
    };

    const collections = {
      puppeteer: puppeteerEvents,
      cypress: cypressEvents,
      playwright: playWrightEvents,
    }

    // @ts-ignore
    const usedCollection = collections[activeFramework];

    let finalScript = '';
    events.forEach((ev) => {
      if (userEventTypes.includes(ev.type)) {
        finalScript += usedCollection[ev.type](ev);
        finalScript += '\n';
      }
    });
    setEventStr(finalScript);
  }, [events, activeFramework]);

  return (
    <div className={'bg-white h-full flex flex-col items-start gap-2'}>
      <div className={'flex items-center gap-4'}>
        <Segmented
          options={[
            { label: 'Puppeteer', value: 'puppeteer' },
            { label: 'Cypress', value: 'cypress' },
            { label: 'Playwright', value: 'playwright' },
          ]}
          value={activeFramework}
          onChange={(value) => setActiveFramework(value)}
        />
        <CopyButton
          size={'middle'}
          variant={'default'}
          content={eventStr}
          className={'capitalize font-medium text-neutral-400'}
        />
      </div>
      <div className={'w-full'}>
        <CodeBlock code={eventStr} language={'javascript'} />
      </div>
    </div>
  );
}

export default UnitStepsModal;
