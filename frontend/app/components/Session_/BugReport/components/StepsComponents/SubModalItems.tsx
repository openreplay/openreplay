import React from 'react';
import { Checkbox } from 'UI';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { durationFromMs } from 'App/date'
import cn from 'classnames'

interface Item {
  time: number;
  message: string;
  type: 'note' | 'network' | 'error';
  key: string;
}

export interface INoteItem extends Item {
  title: string;
}

export interface IError extends Item {
  name?: string;
}

export interface INetworkReq extends Item {
  url: string;
  status: string;
  success: boolean;
}

export type SubItem = INoteItem | IError | INetworkReq;

const safeStr = (ogStr: string) => {
  if (!ogStr) return ''
  return (ogStr.length > 80 ? ogStr.slice(0, 80) + '...' : ogStr)
}

export const NetworkComp = ({ item }: { item: INetworkReq }) => (
  <div className="flex items-start flex-col z-10">
    <div className="flex items-center gap-2 text-disabled-text">
      <div>{durationFromMs(item.time)}</div>
      <div>{safeStr(item.url)}</div>
    </div>
    <div className="flex items-center gap-2">
      <div className="rounded bg-active-blue px-2 whitespace-nowrap overflow-hidden text-clip font-mono">{item.status}</div>
      <div className={item.success ? '' : 'text-red'}>{safeStr(item.message)}</div>
    </div>
  </div>
);

export const NetworkReq = observer(({ item }: { item: INetworkReq }) => {
  const { bugReportStore } = useStore();
  return (
    <SubModalItemContainer
      isChecked={bugReportStore.isSubItemChecked(item)}
      onChange={(isChecked) => bugReportStore.toggleSubItem(isChecked, item)}
    >
      <NetworkComp item={item} />
    </SubModalItemContainer>
  );
});

export const NoteComp = ({ item }: { item: INoteItem }) => (
  <div className="flex items-start flex-col z-10">
    <div>{item.message}</div>
    <div className="text-disabled-text text-sm">{item.title}</div>
  </div>
);

export const NoteItem = observer(({ item }: { item: INoteItem }) => {
  const { bugReportStore } = useStore();
  return (
    <SubModalItemContainer
      isChecked={bugReportStore.isSubItemChecked(item)}
      onChange={(isChecked) => bugReportStore.toggleSubItem(isChecked, item)}
      isNote
    >
      <NoteComp item={item} />
    </SubModalItemContainer>
  );
});

export const ErrorComp = ({ item }: { item: IError }) => (
  <div className="flex items-start flex-col z-10">
    <div className="text-disabled-text">{durationFromMs(item.time)}</div>
    {item.name ? <div className="text-red">{item.name}</div> : null}
    <div className="text-secondary">{safeStr(item.message)}</div>
  </div>
);

export const ErrorItem = observer(({ item }: { item: IError }) => {
  const { bugReportStore } = useStore();
  return (
    <SubModalItemContainer
      isChecked={bugReportStore.isSubItemChecked(item)}
      onChange={(isChecked) => bugReportStore.toggleSubItem(isChecked, item)}
    >
      <ErrorComp item={item} />
    </SubModalItemContainer>
  );
});

export function SubModalItemContainer({
  children,
  isChecked,
  onChange,
  isNote,
}: {
  children: React.ReactNode;
  isChecked: boolean;
  onChange: (arg: any) => void;
  isNote?: boolean;
}) {
  return (
    <div
      className={cn("flex items-start p-2 gap-2 border-t last:border-b cursor-pointer", isNote ? 'note-hover-bg' : 'hover:bg-active-blue')}
      // style={{ background: isNote ? '#FFFEF5' : undefined }}
      onClick={() => onChange(!isChecked)}
    >
      <Checkbox
        name="isIncluded"
        type="checkbox"
        checked={isChecked}
        onChange={(e: any) => onChange(e.target.checked)}
        className="pt-1"
      />
      {children}
    </div>
  );
}
