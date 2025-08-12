import React from 'react';
import cn from 'classnames';
import stl from './ErrorBars.module.css';
import { useTranslation } from 'react-i18next';

const GOOD = 'Good';
const LESS_CRITICAL = 'Few Issues';
const CRITICAL = 'Many Issues';
const getErrorState = (count: number) => {
  if (count === 0) {
    return GOOD;
  }
  if (count < 3) {
    return LESS_CRITICAL;
  }
  return CRITICAL;
};

interface Props {
  count?: number;
}
export default function ErrorBars(props: Props) {
  const { t } = useTranslation();
  const { count = 2 } = props;
  const state = React.useMemo(() => getErrorState(count), [count]);
  const isGood = state === GOOD;
  const showFirstBar = state === LESS_CRITICAL || state === CRITICAL;
  const showSecondBar = state === CRITICAL;
  // const showThirdBar = (state === GOOD || state === CRITICAL);
  // const bgColor = { 'bg-red' : state === CRITICAL, 'bg-red2' : state === LESS_CRITICAL }
  const bgColor = 'bg-red2';
  return isGood ? (
    <></>
  ) : (
    <div className={"flex flex-col-reverse md:flex-col gap-1"}>
      <div className="relative" style={{ width: '100px' }}>
        <div
          className="grid grid-cols-3 gap-1 absolute inset-0"
          style={{ opacity: '1' }}
        >
          {showFirstBar && (
            <div className={cn('rounded-tl rounded-bl', bgColor, stl.bar)} />
          )}
          {showSecondBar && (
            <div className={cn('rounded-tl rounded-bl', bgColor, stl.bar)} />
          )}
          {/* { showThirdBar && <div className={cn("rounded-tl rounded-bl", bgColor, stl.bar)}></div> } */}
        </div>
        <div className="grid grid-cols-3 gap-1" style={{ opacity: '0.3' }}>
          <div className={cn('rounded-tl rounded-bl', bgColor, stl.bar)} />
          <div className={cn(bgColor, stl.bar)} />
          {/* <div className={cn("rounded-tr rounded-br", bgColor, stl.bar)}></div> */}
        </div>
      </div>
      <div className="color-gray-medium text-sm truncate">{t(state)}</div>
    </div>
  );
}
