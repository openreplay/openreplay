import { Icon } from '@/ui/icons/Icon';
import { Tooltip } from '@/ui/overlays/tooltip';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { TYPES } from 'App/types/session/event';
import { types as issueTypes } from 'App/types/session/issue';

interface CommonProps {
  item: any;
  createEventClickHandler: any;
}

export function shortenResourceName(name: string) {
  return name.length > 100
    ? `${name.slice(0, 100)} ... ${name.slice(-50)}`
    : name;
}
export function NetworkElement({ item, createEventClickHandler }: CommonProps) {
  const { t } = useTranslation();
  const name = item.name || '';
  return (
    <Tooltip
      side="right"
      title={
        <div className="">
          <b>{item.success ? t('Slow resource: ') : '4xx/5xx Error:'}</b>
          <br />
          {shortenResourceName(name)}
        </div>
      }
    >
      <button
        type="button"
        onClick={createEventClickHandler(item, 'NETWORK')}
        className="m-dt__mark"
        aria-label={shortenResourceName(name)}
      />
    </Tooltip>
  );
}

export function getFrustration(item: any) {
  const elData = { name: '', icon: '' };
  if (item.type === TYPES.CLICK) {
    Object.assign(elData, {
      name: `User hesitated to click for ${Math.round(
        item.hesitation / 1000,
      )}s`,
      icon: 'click-hesitation',
    });
  }
  if (item.type === TYPES.INPUT) {
    Object.assign(elData, {
      name: `User hesitated to enter a value for ${Math.round(
        item.hesitation / 1000,
      )}s`,
      icon: 'input-hesitation',
    });
  }
  if (item.type === TYPES.CLICKRAGE || item.type === TYPES.TAPRAGE)
    Object.assign(elData, { name: 'Click Rage', icon: 'click-rage' });
  if (item.type === TYPES.DEAD_LICK)
    Object.assign(elData, { name: 'Dead Click', icon: 'emoji-dizzy' });
  if (item.type === issueTypes.MOUSE_THRASHING)
    Object.assign(elData, { name: 'Mouse Thrashing', icon: 'cursor-trash' });
  if (item.type === 'ios_perf_event')
    Object.assign(elData, { name: item.name, icon: item.icon });

  return elData;
}
export function FrustrationElement({
  item,
  createEventClickHandler,
}: CommonProps) {
  const elData = getFrustration(item);
  return (
    <Tooltip
      side="top"
      title={
        <div className="">
          <b>{elData.name}</b>
        </div>
      }
    >
      <button
        type="button"
        onClick={createEventClickHandler(item, null)}
        className="m-dt__mark"
        aria-label={elData.name}
      />
    </Tooltip>
  );
}

export function StackEventElement({
  item,
  createEventClickHandler,
}: CommonProps) {
  return (
    <Tooltip
      side="right"
      title={
        <div className="">
          <b>{item.name || 'Stack Event'}</b>
        </div>
      }
    >
      <button
        type="button"
        onClick={createEventClickHandler(item, 'EVENT')}
        className="m-dt__mark"
        aria-label={item.name || 'Stack Event'}
      />
    </Tooltip>
  );
}

export function PerformanceElement({
  item,
  createEventClickHandler,
}: CommonProps) {
  return (
    <Tooltip
      side="right"
      title={
        <div className="">
          <b>{item.type}</b>
        </div>
      }
    >
      <button
        type="button"
        onClick={createEventClickHandler(item, 'PERFORMANCE')}
        className="m-dt__mark"
        aria-label={item.type}
      />
    </Tooltip>
  );
}

export function ExceptionElement({
  item,
  createEventClickHandler,
}: CommonProps) {
  const { t } = useTranslation();
  return (
    <Tooltip
      side="right"
      title={
        <div className="">
          <b>{t('Exception')}</b>
          <br />
          <span>{item.message}</span>
        </div>
      }
    >
      <button
        type="button"
        onClick={createEventClickHandler(item, 'ERRORS')}
        className="m-dt__mark"
        aria-label={item.message}
      />
    </Tooltip>
  );
}
