import type Screen from 'Player/web/Screen/Screen';
import { Button, Checkbox, Select } from 'antd';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { Input as InputEvent, TYPES } from 'App/types/session/event';
import { PlayerContext } from 'Components/Session/playerContext';
import { CodeBlock, Icon } from 'UI';

import {
  cypressEvents,
  k6Events,
  playWrightEvents,
  puppeteerEvents,
} from './utils';

interface Props {
  onClose: () => void;
}

function isCssSelector(label: string): boolean {
  if (!label) return false;
  return /^[^a-zA-Z0-9]/.test(label);
}

function isInputEvent(ev): ev is InputEvent {
  return ev.type === TYPES.INPUT && 'label' in ev && isCssSelector(ev.label);
}

const defaultFrameworkKey = '__$defaultFrameworkKey$__';
export const getDefaultFramework = () => {
  const stored = localStorage.getItem(defaultFrameworkKey);
  return stored ?? 'cypress';
};

export const frameworkIcons = {
  cypress: <Icon name={'cypress'} size={18} />,
  puppeteer: <Icon name={'puppeteer'} size={18} />,
  playwright: <Icon name={'pwright'} size={18} />,
  k6: <div className="text-disabled-text text-lg">k6</div>,
};

interface MultiInputEntry {
  selector: string;
  time: number;
  elements: { parentSelector: string; index: number; value: string }[];
}

function getParentSelector(el: Element): string {
  const parent = el.parentElement;
  if (!parent || parent === el.ownerDocument.body) return '';
  const tag = parent.tagName.toLowerCase();
  if (parent.id) return `${tag}#${parent.id}`;
  if (parent.className && typeof parent.className === 'string') {
    const cls = parent.className.trim().split(/\s+/)[0];
    return `${tag}.${cls}`;
  }
  return tag;
}

function UnitStepsModal({ onClose }: Props) {
  const { t } = useTranslation();
  const { sessionStore, uiPlayerStore } = useStore();
  const { store, player } = React.useContext(PlayerContext);
  const [eventStr, setEventStr] = React.useState('');
  const [mode, setMode] = React.useState('test');
  const [activeFramework, setActiveFramework] =
    React.useState(getDefaultFramework);
  const [multiInputs, setMultiInputs] = React.useState<MultiInputEntry[]>([]);
  const [pickedInputs, setPickedInputs] = React.useState<Map<string, number>>(
    new Map(),
  );
  const [resolvedValues, setResolvedValues] = React.useState<
    Map<string, string>
  >(new Map());
  const [pickInputsOpen, setPickInputsOpen] = React.useState(false);
  const highlightTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const hoveredElRef = React.useRef<HTMLElement | null>(null);
  const pickedInputsRef = React.useRef(pickedInputs);

  React.useEffect(() => {
    pickedInputsRef.current = pickedInputs;
  }, [pickedInputs]);

  const screenObj = (player as any).screen as Screen | undefined;

  const events = React.useMemo(() => {
    if (!sessionStore.current.events) {
      return [];
    }
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
      screenObj?.highlightElement(null);
      if (highlightTimerRef.current) clearInterval(highlightTimerRef.current);
    };
  }, []);

  const generateScript = React.useCallback(
    (valuesMap: Map<string, string>) => {
      const userEventTypes = [TYPES.LOCATION, TYPES.CLICK, TYPES.INPUT];
      const collections = {
        puppeteer: puppeteerEvents,
        cypress: cypressEvents,
        playwright: playWrightEvents,
        k6: k6Events,
      };
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
          if (mode === 'test') finalScript += '    ';
          if (ev.type === TYPES.INPUT) {
            const resolved = valuesMap
              .get(`${ev.time}_${ev.label}`)
              ?.replace(/'/g, "\\'");
            finalScript += usedCollection[ev.type](ev, resolved);
          } else {
            finalScript += usedCollection[ev.type](ev);
          }
          finalScript += '\n';
        }
      });
      if (mode === 'test') finalScript += usedCollection.testOutro();
      setEventStr(finalScript);
    },
    [events, activeFramework, mode, tabNames, currentTab],
  );

  // Regenerate script whenever resolved values, framework, mode, or events change
  React.useEffect(() => {
    generateScript(resolvedValues);
  }, [generateScript, resolvedValues]);

  const hasResolvedRef = React.useRef(false);

  const resolveInputValues = React.useCallback(async () => {
    await player.freeze();
    const selectorInputs = events.filter((ev): ev is InputEvent =>
      isInputEvent(ev),
    );
    if (!selectorInputs.length) {
      player.unfreeze(false);
      return;
    }

    uiPlayerStore.setResolvingInputs(true);

    const report: string[] = [
      `[UnitSteps] Input Value Resolution Report`,
      `Framework: ${activeFramework} | Mode: ${mode} | Total events: ${events.length}`,
      `Selector input events: ${selectorInputs.length}`,
      `---`,
    ];

    const newResolvedValues = new Map<string, string>();
    const detectedMultiInputs: MultiInputEntry[] = [];
    const seenMultiKeys = new Set<string>();
    const currentTime = store.get().time;
    const offsets = [0, 50, 200];

    for (const ev of selectorInputs) {
      let resolved = false;

      for (const offset of offsets) {
        player.jump(ev.time + offset, true);
        await new Promise((r) => requestAnimationFrame(r));
        const doc = screenObj?.document;

        if (!doc) {
          report.push(
            `  [FAIL] "${ev.label}" @${ev.time}ms +${offset}ms — no iframe document`,
          );
          continue;
        }

        try {
          const allEls = Array.from(
            doc.querySelectorAll(ev.label),
          ) as HTMLInputElement[];

          if (allEls.length > 1) {
            const picked = pickedInputsRef.current.get(
              `${ev.time}_${ev.label}`,
            );
            const idx = picked ?? 0;
            const el = allEls[idx];

            const elements = allEls.map((e, i) => ({
              parentSelector: getParentSelector(e),
              index: i,
              value: e.value || '',
            }));

            const multiKey = `${ev.time}_${ev.label}`;
            if (!seenMultiKeys.has(multiKey)) {
              seenMultiKeys.add(multiKey);
              detectedMultiInputs.push({
                selector: ev.label,
                time: ev.time,
                elements,
              });
            }

            if (el?.value) {
              newResolvedValues.set(`${ev.time}_${ev.label}`, el.value);
              report.push(
                `  [OK]   "${ev.label}" @${ev.time}ms +${offset}ms — multi(${allEls.length}) picked[${idx}] value: "${el.value}"`,
              );
              resolved = true;
              break;
            } else {
              report.push(
                `  [MISS] "${ev.label}" @${ev.time}ms +${offset}ms — multi(${allEls.length}) picked[${idx}] empty`,
              );
            }
          } else {
            const el = allEls[0] ?? null;
            if (el?.value) {
              newResolvedValues.set(`${ev.time}_${ev.label}`, el.value);
              report.push(
                `  [OK]   "${ev.label}" @${ev.time}ms +${offset}ms — value: "${el.value}"`,
              );
              resolved = true;
              break;
            } else {
              report.push(
                `  [MISS] "${ev.label}" @${ev.time}ms +${offset}ms — element ${el ? 'found but empty' : 'not found'}`,
              );
            }
          }
        } catch (e) {
          report.push(
            `  [ERR]  "${ev.label}" @${ev.time}ms +${offset}ms — ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      if (!resolved) {
        report.push(
          `  [UNRESOLVED] "${ev.label}" @${ev.time}ms — all offsets exhausted, using fallback "Test Input"`,
        );
      }
    }

    player.jump(currentTime, true);
    report.push(`---`);
    report.push(
      `Resolved: ${newResolvedValues.size}/${selectorInputs.length} selector inputs`,
    );
    console.log(report.join('\n'));

    setMultiInputs(detectedMultiInputs);
    setResolvedValues(newResolvedValues);
    hasResolvedRef.current = true;
    uiPlayerStore.setResolvingInputs(false);
    player.unfreeze(false);
  }, [events, activeFramework, mode, player, screenObj, store]);

  // Re-resolve when user picks a different input (only after first resolution)
  React.useEffect(() => {
    if (!hasResolvedRef.current) return;
    resolveInputValues();
  }, [pickedInputs]);

  const highlightInput = (selector: string, time: number, index: number) => {
    requestAnimationFrame(() => {
      const doc = screenObj?.document;
      if (!doc) return;
      try {
        const els = doc.querySelectorAll(selector);
        const el = els[index] as HTMLElement | undefined;
        if (el) {
          screenObj?.highlightElement(el);
          hoveredElRef.current = el;

          if (highlightTimerRef.current)
            clearInterval(highlightTimerRef.current);
          highlightTimerRef.current = setInterval(() => {
            if (!hoveredElRef.current) {
              screenObj?.highlightElement(null);
              if (highlightTimerRef.current)
                clearInterval(highlightTimerRef.current);
            }
          }, 100);
        }
      } catch {
        // invalid selector
      }
    });
  };

  const clearHighlight = () => {
    hoveredElRef.current = null;
    screenObj?.highlightElement(null);
    if (highlightTimerRef.current) clearInterval(highlightTimerRef.current);
  };

  const pickInput = (selector: string, time: number, index: number) => {
    setPickedInputs((prev) => {
      const next = new Map(prev);
      next.set(`${time}_${selector}`, index);
      return next;
    });
  };

  const selectorInputsCount = React.useMemo(
    () => events.filter((ev) => isInputEvent(ev)).length,
    [events],
  );

  const enableZoom = () => {
    if (!sessionStore.current.events) {
      return;
    }
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
  };

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
        size="small"
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
          {
            label: (
              <div className={'flex items-center gap-2'}>
                <div className="text-disabled-text text-lg">k6</div>
                <div>{t('Grafana K6')}</div>
              </div>
            ),
            value: 'k6',
          },
        ]}
        value={activeFramework}
        onChange={changeFramework}
      />
      <Checkbox
        checked={uiPlayerStore.exportEventsSelection.enabled}
        onChange={(e) => toggleZoom(e.target.checked)}
      >
        {t('Select events on the timeline')}
      </Checkbox>
      <div className={'flex items-center gap-2 w-full'}>
        <Select
          className={'w-42'}
          value={mode}
          size="small"
          onChange={setMode}
          options={[
            { label: t('Events Only'), value: 'events' },
            { label: t('Complete Test'), value: 'test' },
          ]}
        />
        {selectorInputsCount > 0 && (
          <Button
            size="small"
            onClick={resolveInputValues}
            loading={uiPlayerStore.resolvingInputs}
          >
            {resolvedValues.size > 0
              ? t('Re-resolve Input Values')
              : t('Resolve Input Values')}
          </Button>
        )}
      </div>
      {multiInputs.length > 0 && (
        <div className={'w-full'}>
          <div
            className={
              'flex items-center gap-1 cursor-pointer text-sm font-medium'
            }
            onClick={() => setPickInputsOpen(!pickInputsOpen)}
          >
            {pickInputsOpen ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
            {t('Inputs with similar selector')} ({multiInputs.length})
          </div>
          {pickInputsOpen && (
            <div
              className={
                'mt-1 border rounded p-2 flex flex-col gap-2 max-h-40 overflow-y-auto text-xs'
              }
            >
              {multiInputs.map((entry) => {
                const key = `${entry.time}_${entry.selector}`;
                const picked = pickedInputs.get(key) ?? 0;
                return (
                  <div key={key}>
                    <div className={'font-mono text-disabled-text mb-1'}>
                      {entry.selector}{' '}
                      <span className={'text-gray-400'}>@{entry.time}ms</span>
                    </div>
                    <div className={'flex flex-col gap-0.5 pl-2'}>
                      {entry.elements.map((el) => (
                        <div
                          key={el.index}
                          className={`flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer ${
                            picked === el.index
                              ? 'bg-active-blue font-medium'
                              : 'hover:bg-gray-lightest'
                          }`}
                          onClick={() =>
                            pickInput(entry.selector, entry.time, el.index)
                          }
                          onMouseEnter={() =>
                            highlightInput(entry.selector, entry.time, el.index)
                          }
                          onMouseLeave={clearHighlight}
                        >
                          <span className={'font-mono'}>
                            {el.parentSelector ? `${el.parentSelector} > ` : ''}
                            {entry.selector}
                          </span>
                          <span className={'text-gray-400'}>[{el.index}]</span>
                          {el.value && (
                            <span
                              className={
                                'text-green-600 ml-auto truncate max-w-[120px]'
                              }
                            >
                              {`"${el.value}"`}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div className={'w-full'}>
        <CodeBlock
          width={540}
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
