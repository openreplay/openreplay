import React from 'react';
import { EXCEPTIONS, NETWORK } from 'App/mstore/uiPlayerStore';
import { TYPES } from 'App/types/session/event';
import { types as issueTypes } from 'App/types/session/issue';
import { Icon } from 'UI';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

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
      placement="right"
      title={
        <div className="">
          <b>{item.success ? t('Slow resource: ') : '4xx/5xx Error:'}</b>
          <br />
          {shortenResourceName(name)}
        </div>
      }
    >
      <div
        onClick={createEventClickHandler(item, NETWORK)}
        className="cursor-pointer"
      >
        <div className="h-4 w-4 rounded-full bg-red text-white font-bold flex items-center justify-center text-sm">
          <span>!</span>
        </div>
      </div>
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
      placement="top"
      title={
        <div className="">
          <b>{elData.name}</b>
        </div>
      }
    >
      <div
        onClick={createEventClickHandler(item, null)}
        className="cursor-pointer"
      >
        <Icon name={elData.icon} color="black" size="16" />
      </div>
    </Tooltip>
  );
}

export function StackEventElement({
  item,
  createEventClickHandler,
}: CommonProps) {
  return (
    <Tooltip
      placement="right"
      title={
        <div className="">
          <b>{item.name || 'Stack Event'}</b>
        </div>
      }
    >
      <div
        onClick={createEventClickHandler(item, 'EVENT')}
        className="cursor-pointer w-1 h-4 bg-red"
      >
        {/* <Icon className="rounded-full bg-white" name="funnel/exclamation-circle-fill" color="red" size="16" /> */}
      </div>
    </Tooltip>
  );
}

export function PerformanceElement({
  item,
  createEventClickHandler,
}: CommonProps) {
  return (
    <Tooltip
      placement="right"
      title={
        <div className="">
          <b>{item.type}</b>
        </div>
      }
    >
      <div
        onClick={createEventClickHandler(item, EXCEPTIONS)}
        className="cursor-pointer w-1 h-4 bg-red"
      >
        {/* <Icon className="rounded-full bg-white" name="funnel/exclamation-circle-fill" color="red" size="16" /> */}
      </div>
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
      placement="right"
      title={
        <div className="">
          <b>{t('Exception')}</b>
          <br />
          <span>{item.message}</span>
        </div>
      }
    >
      <div
        onClick={createEventClickHandler(item, 'ERRORS')}
        className="cursor-pointer"
      >
        <div className="h-4 w-4 rounded-full bg-red text-white font-bold flex items-center justify-center text-sm">
          <span>!</span>
        </div>
      </div>
    </Tooltip>
  );
}
