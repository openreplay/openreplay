import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { CodeBlock } from '@/ui/data/CodeBlock';
import { Icon } from '@/ui/icons/Icon';
import { InlineSelect } from '@/ui/inputs/select';
import { Switch } from '@/ui/inputs/switch';
import { Segmented } from '@/ui/inputs/toggle-group';
import type Screen from 'Player/web/Screen/Screen';
import { X } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { durationFromMs } from 'App/date';
import { useStore } from 'App/mstore';
import { Input as InputEvent, TYPES } from 'App/types/session/event';
import 'Components/Session/ReplayScreen/activity-panel.css';
import 'Components/Session/ReplayScreen/export-e2e.css';
import { PlayerContext } from 'Components/Session/playerContext';

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

type Framework = 'cypress' | 'puppeteer' | 'playwright' | 'k6';
const FRAMEWORKS: { key: Framework; label: string }[] = [
  { key: 'cypress', label: 'Cypress' },
  { key: 'puppeteer', label: 'Puppeteer' },
  { key: 'playwright', label: 'Playwright' },
  { key: 'k6', label: 'k6' },
];

export const frameworkIcons: Record<Framework, React.ReactNode> = {
  cypress: <Icon name="cypress" size={13} />,
  puppeteer: <Icon name="puppeteer" size={13} />,
  playwright: <Icon name="pwright" size={13} />,
  k6: (
    <span className="m-e2e__k6 m-mono" aria-hidden="true">
      k6
    </span>
  ),
};

interface MultiInputEntry {
  selector: string;
  time: number;
  elements: { parentSelector: string; index: number; value: string }[];
}

function normalizeSelector(selector: string): string {
  return selector.replace(
    /\[\s*([-\w:]+)\s*([~|^$*]?=)\s*([^\]]*?)\s*\]/g,
    (_full, attr, op, rawValue) => {
      const value = rawValue.trim();
      const alreadyQuoted =
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"));
      if (alreadyQuoted) return `[${attr}${op}${value}]`;
      const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `[${attr}${op}"${escaped}"]`;
    },
  );
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
            doc.querySelectorAll(normalizeSelector(ev.label)),
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
        const els = doc.querySelectorAll(normalizeSelector(selector));
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

  const jumpToMs = (ms: number) => {
    player.jump(ms, true);
    player.pause();
  };

  return (
    <div className="m-e2e-panel">
      <div className="m-feat__formhead">
        <span className="flex-1">{t('Export as E2E test')}</span>
        <IconButton
          icon={<X size={14} />}
          label={t('Close')}
          variant="ghost"
          onClick={onClose}
        />
      </div>
      <div className="m-e2e__body">
        <Segmented
          block
          ariaLabel={t('Framework')}
          value={activeFramework as Framework}
          onChange={changeFramework}
          options={FRAMEWORKS.map((f) => ({
            value: f.key,
            label: f.label,
            icon: f.key === 'k6' ? undefined : frameworkIcons[f.key],
          }))}
        />
        <label className="m-e2e__row">
          <Switch
            checked={uiPlayerStore.exportEventsSelection.enabled}
            onCheckedChange={(on) => toggleZoom(on)}
          />
          <span>{t('Select events on the timeline')}</span>
        </label>
        <div className="m-e2e__row">
          <InlineSelect
            ariaLabel={t('What to export')}
            value={mode as 'events' | 'test'}
            onChange={setMode}
            options={[
              { label: t('Complete test'), value: 'test' },
              { label: t('Events only'), value: 'events' },
            ]}
          />
          {selectorInputsCount > 0 && (
            <Button
              variant="subtle"
              onClick={resolveInputValues}
              disabled={uiPlayerStore.resolvingInputs}
            >
              {uiPlayerStore.resolvingInputs
                ? t('Resolving…')
                : resolvedValues.size > 0
                  ? t('Re-resolve input values')
                  : t('Resolve input values')}
            </Button>
          )}
        </div>
        {multiInputs.length > 0 && (
          <details
            className="m-e2e__inputs"
            open={pickInputsOpen}
            onToggle={(e) => setPickInputsOpen(e.currentTarget.open)}
          >
            <summary>
              {t('Inputs with similar selector')} ({multiInputs.length})
            </summary>
            <div className="m-e2e__inputs-list">
              {multiInputs.map((entry) => {
                const key = `${entry.time}_${entry.selector}`;
                const picked = pickedInputs.get(key) ?? 0;
                return (
                  <div key={key}>
                    <button
                      type="button"
                      onClick={() => jumpToMs(entry.time)}
                      className="m-e2e__input-sel m-mono"
                    >
                      {entry.selector}{' '}
                      <span>@{durationFromMs(entry.time)}</span>
                    </button>
                    {entry.elements.map((el) => (
                      <button
                        type="button"
                        key={el.index}
                        className={`m-e2e__input-el${picked === el.index ? ' is-on' : ''}`}
                        onClick={() =>
                          pickInput(entry.selector, entry.time, el.index)
                        }
                        onMouseEnter={() =>
                          highlightInput(entry.selector, entry.time, el.index)
                        }
                        onMouseLeave={clearHighlight}
                      >
                        <span className="m-mono m-truncate">
                          {el.parentSelector ? `${el.parentSelector} > ` : ''}
                          {entry.selector}
                        </span>
                        <span className="m-e2e__input-idx">[{el.index}]</span>
                        {el.value && (
                          <span className="m-e2e__input-val m-truncate">
                            {`"${el.value}"`}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </details>
        )}
        <CodeBlock
          code={eventStr}
          language="JavaScript"
          caption={t('{{n}} events', { n: events.length })}
          copyLabel={t('Copy test')}
        />
      </div>
    </div>
  );
}

export default observer(UnitStepsModal);
