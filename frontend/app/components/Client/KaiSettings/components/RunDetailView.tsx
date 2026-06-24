import { Alert, Progress } from 'antd';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RunDetail } from './shared/types';

// Delay between auto-advanced screenshots when not hovering a step.
const AUTOPLAY_DELAY = 1500;

const stepClassName = (status: string) => {
  if (status === 'failed' || status === 'error') {
    return 'text-red bg-red-lightest font-medium';
  }
  if (status === 'skipped') return 'text-disabled-text';
  return '';
};

function RunDetailView({ detail }: { detail: RunDetail }) {
  const { t } = useTranslation();
  const steps = detail.steps ?? [];

  // Steps that actually have a screenshot, keeping their original index.
  const shots = steps
    .map((step, index) => ({ step, index }))
    .filter((x) => !!x.step.screenshot);

  const [hovered, setHovered] = useState<number | null>(null);
  const [pos, setPos] = useState(0);

  // Auto-play the screenshots in order while the user isn't hovering a step.
  const playing = hovered == null && shots.length > 1;
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      setPos((p) => (p + 1) % shots.length);
    }, AUTOPLAY_DELAY);
    return () => clearInterval(id);
  }, [playing, shots.length]);

  const safePos = shots.length ? pos % shots.length : 0;
  const activeIndex = hovered != null ? hovered : (shots[safePos]?.index ?? -1);
  const activeScreenshot =
    hovered != null
      ? steps[hovered]?.screenshot
      : shots[safePos]?.step.screenshot;
  const progress = shots.length ? ((safePos + 1) / shots.length) * 100 : 0;

  return (
    <div className="p-4 grid grid-cols-12 gap-4">
      {/* Left: steps — hover one to pin its screenshot */}
      <div className="col-span-7 flex flex-col gap-2">
        <div className="font-medium text-sm">{t('Test Steps')}</div>
        <ol className="text-sm flex flex-col gap-1">
          {steps.map((step, idx) => (
            <li
              key={step.stepIndex}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              className={`flex gap-2 px-2 py-1 rounded cursor-default transition-colors ${
                idx === activeIndex ? 'bg-active-blue' : ''
              } ${stepClassName(step.status)}`}
            >
              <span className="text-disabled-text">{idx + 1}.</span>
              <span className="flex-1">
                {step.action}
                {step.status !== 'passed' && (
                  <span className="ml-2 text-xs">({step.status})</span>
                )}
                {step.error && <div className="text-xs mt-1">{step.error}</div>}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Right: screenshot viewer */}
      <div className="col-span-5 flex flex-col gap-3">
        {detail.finalResult && (
          <div className="text-sm">
            <span className="text-disabled-text">{t('Result')}: </span>
            <span className="font-medium">{detail.finalResult}</span>
          </div>
        )}
        {detail.failedStepIndex != null && (
          <Alert
            type="error"
            classNames={{ root: 'px-4! py-2!' }}
            title={t('Test Failed')}
            description={
              <div className="text-sm flex flex-col gap-1">
                <span>
                  {t('Failed at step')}: {detail.failedStepIndex + 1}
                </span>
                {detail.failedStepText && <span>{detail.failedStepText}</span>}
                {detail.failedStepError && (
                  <span className="text-xs">{detail.failedStepError}</span>
                )}
              </div>
            }
            showIcon={false}
          />
        )}

        <div className="border rounded overflow-hidden bg-gray-100 aspect-video flex items-center justify-center">
          {activeScreenshot ? (
            <img
              src={activeScreenshot}
              alt={t('Step screenshot')}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-xs text-disabled-text p-4 text-center">
              {steps.length
                ? t('No screenshot for this step')
                : t('No steps recorded')}
            </div>
          )}
        </div>

        {shots.length > 0 && (
          <div className="flex flex-col gap-1">
            <Progress
              percent={progress}
              showInfo={false}
              strokeWidth={6}
              status={hovered != null ? 'normal' : 'active'}
            />
            <div className="text-xs text-disabled-text text-center">
              {hovered != null
                ? t('Hovering step')
                : `${t('Playing')} ${safePos + 1} / ${shots.length}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RunDetailView;
