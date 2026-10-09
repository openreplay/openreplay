import { useStore } from '@/mstore';
import { Button } from '@/ui/actions/button';
import { BrowserIcon } from '@/ui/brand/BrowserIcon';
import { ListFooter } from '@/ui/layout/ListFooter';
import { EntityDrawer } from '@/ui/overlays/EntityDrawer';
import { FilterKey } from 'Types/filter/filterType';
import {
  ArrowUpDown,
  ChevronRight,
  FileCode2,
  Globe,
  Laptop,
  Link,
  Monitor,
  MonitorSmartphone,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import 'App/components/Dashboard/charts.css';
import { hashString } from 'App/mstore/types/session';
import NoDataInWindow from 'Components/Dashboard/components/NoDataInWindow';

import { SessionAvatar } from 'Shared/SessionAvatar/SessionAvatar';

interface Props {
  metric?: any;
  data: any;
  onClick?: (filters: any) => void;
  isTemplate?: boolean;
  /** on a dashboard: four rows fit the widget */
  inGrid?: boolean;
}

function SessionsBy(props: Props) {
  const {
    metric = {},
    data = { values: [] },
    onClick = () => null,
    inGrid = false,
  } = props;
  const rows = inGrid ? 4 : 3;
  const { t } = useTranslation();
  const { filterStore } = useStore();
  const [selected, setSelected] = React.useState<any>(null);
  const { total } = data;

  const onClickHandler = async (_: any, row: any) => {
    if (metric.metricOf === FilterKey.RESOLUTIONS) {
      const allFilters = filterStore.getCurrentProjectFilters();
      const screenWidthFilter = allFilters.find(
        (f) => f.name === FilterKey.SCREEN_WIDTH,
      );
      const screenHeightFilter = allFilters.find(
        (f) => f.name === FilterKey.SCREEN_HEIGHT,
      );

      if (!screenWidthFilter || !screenHeightFilter) {
        console.error('Screen width/height filters not found in filterStore');
        return;
      }

      const minWidth = row.minWidth || 0;
      const maxWidth = row.maxWidth || 0;
      const minHeight = row.minHeight || 0;
      const maxHeight = row.maxHeight || 0;

      const widthMinFilter = {
        value: [minWidth.toString()],
        name: screenWidthFilter.name,
        dataType: screenWidthFilter.dataType || 'number',
        operator: '>=',
        propertyOrder: 'and',
        isEvent: false,
        autoCaptured: screenWidthFilter.autoCaptured,
        displayValue: row.name,
      };

      const widthMaxFilter = {
        value: [maxWidth.toString()],
        name: screenWidthFilter.name,
        dataType: screenWidthFilter.dataType || 'number',
        operator: '<=',
        propertyOrder: 'and',
        isEvent: false,
        autoCaptured: screenWidthFilter.autoCaptured,
      };

      const heightMinFilter = {
        value: [minHeight.toString()],
        name: screenHeightFilter.name,
        dataType: screenHeightFilter.dataType || 'number',
        operator: '>=',
        propertyOrder: 'and',
        isEvent: false,
        autoCaptured: screenHeightFilter.autoCaptured,
      };

      const heightMaxFilter = {
        value: [maxHeight.toString()],
        name: screenHeightFilter.name,
        dataType: screenHeightFilter.dataType || 'number',
        operator: '<=',
        propertyOrder: 'and',
        isEvent: false,
        autoCaptured: screenHeightFilter.autoCaptured,
      };

      setSelected(row.name);
      onClick([
        widthMinFilter,
        widthMaxFilter,
        heightMinFilter,
        heightMaxFilter,
      ]);
      return;
    }

    const allFilters = filterStore.getCurrentProjectFilters();
    const metricFilter = allFilters.find((f) => f.name === metric.metricOf);

    if (!metricFilter) {
      console.error(`Filter not found for metric: ${metric.metricOf}`);
      return;
    }

    const baseFilter: any = {
      value: metricFilter.isEvent ? [] : [row.name],
      name: metricFilter.name,
      dataType: metricFilter.dataType,
      operator: 'is',
      propertyOrder: 'and',
      isEvent: metricFilter.isEvent || false,
      autoCaptured: metricFilter.autoCaptured,
      filters: [],
    };

    if (metricFilter.isEvent) {
      const props = await filterStore.getEventFilters(metricFilter.id);
      const defaultProps = props?.filter((p) => p.defaultProperty) || [];
      baseFilter.filters = defaultProps.map((prop) => ({
        ...prop,
        value: [row.name],
        operator: 'is',
      }));
    }

    if (metric.metricOf === FilterKey.FETCH) {
      const fetchUrlFilter = allFilters.find(
        (f) => f.name === FilterKey.FETCH_URL,
      );
      if (fetchUrlFilter) {
        baseFilter.filters = [
          {
            name: fetchUrlFilter.name,
            operator: 'is',
            value: [row.name],
            propertyOrder: 'and',
            dataType: fetchUrlFilter.dataType,
            isEvent: fetchUrlFilter.isEvent || false,
            autoCaptured: fetchUrlFilter.autoCaptured,
          },
        ];
      }
    }

    setSelected(row.name);
    onClick([baseFilter]);
  };

  const [drawer, setDrawer] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const values: any[] = data.values ?? [];
  if (values.length === 0) {
    return <NoDataInWindow inGrid={inGrid} list />;
  }
  const more = Math.max(0, (total ?? values.length) - rows);
  const sum = values.reduce((a, r) => a + rowCount(r), 0);
  const pageRows = values.slice((page - 1) * DRAWER_PAGE, page * DRAWER_PAGE);

  return (
    <div className="m-top is-compact">
      <ol className="m-top__list">
        {values.slice(0, rows).map((r) => (
          <TopRow
            key={r.name}
            row={r}
            dimension={metric.metricOf}
            selected={selected === r.name}
            onClick={() => void onClickHandler(null, r)}
          />
        ))}
      </ol>
      {more > 0 && (
        <Button
          variant="subtle"
          className="m-top__more"
          onClick={(e) => {
            e.stopPropagation();
            setDrawer(true);
          }}
        >
          {t('{{n}} more', { n: more.toLocaleString() })}
          <ChevronRight size={13} />
        </Button>
      )}
      {drawer && (
        <span onClick={(e) => e.stopPropagation()}>
          <EntityDrawer
            size="wide"
            open
            onClose={() => setDrawer(false)}
            title={metric.name ?? t('All values')}
            meta={
              <span className="m-cardd__facts">
                <span>
                  {t('{{n}} values', { n: values.length.toLocaleString() })}
                </span>
              </span>
            }
            footer={
              <ListFooter
                page={page}
                pageSize={DRAWER_PAGE}
                total={values.length}
                noun={[t('value'), t('values')]}
                onPage={setPage}
              />
            }
          >
            <div className="m-top m-top--drawer">
              <ol className="m-top__list" start={(page - 1) * DRAWER_PAGE + 1}>
                {pageRows.map((r, i) => (
                  <TopRow
                    key={r.name}
                    row={r}
                    rank={(page - 1) * DRAWER_PAGE + i + 1}
                    share={sum ? rowCount(r) / sum : 0}
                    dimension={metric.metricOf}
                    selected={selected === r.name}
                    onClick={() => {
                      setDrawer(false);
                      void onClickHandler(null, r);
                    }}
                  />
                ))}
              </ol>
            </div>
          </EntityDrawer>
        </span>
      )}
    </div>
  );
}

const DRAWER_PAGE = 20;
const rowCount = (r: any) =>
  Number(String(r.sessionCount ?? 0).replace(/[^0-9.]/g, '')) || 0;
const pct = (x: number) =>
  x >= 0.1 ? `${Math.round(x * 10) / 10}%` : x > 0 ? '<0.1%' : '0%';

function RowMark({ dimension, row }: { dimension: string; row: any }) {
  const label = String(row.name ?? '');
  switch (dimension) {
    case FilterKey.USER_BROWSER:
      return <BrowserIcon name={label} size={15} />;
    case FilterKey.USERID:
      return (
        <SessionAvatar seed={hashString(label || 'Anonymous')} size={18} />
      );
    case FilterKey.USER_DEVICE: {
      const l = label.toLowerCase();
      const I = /ipad|tablet/.test(l)
        ? Tablet
        : /mobile|iphone|android|smartphone|phone|moto/.test(l)
          ? Smartphone
          : /desktop|mac|windows|linux|laptop/.test(l)
            ? Monitor
            : MonitorSmartphone;
      return <I size={15} strokeWidth={1.75} />;
    }
    case FilterKey.RESOLUTIONS: {
      const w = parseInt(label, 10) || 0;
      const I =
        w >= 1920
          ? Monitor
          : w >= 1280
            ? Laptop
            : w >= 800
              ? Tablet
              : Smartphone;
      return <I size={15} strokeWidth={1.75} />;
    }
    case FilterKey.REFERRER:
      return <Globe size={15} strokeWidth={1.75} />;
    case FilterKey.FETCH:
      return /\.(m?js|css|json|map|ts)(\?|$)/.test(label) ? (
        <FileCode2 size={15} strokeWidth={1.75} />
      ) : (
        <ArrowUpDown size={15} strokeWidth={1.75} />
      );
    case FilterKey.LOCATION:
      return <Link size={15} strokeWidth={1.75} />;
    default:
      return <>{row.icon}</>;
  }
}

function TopRow({
  row,
  rank,
  share,
  dimension,
  selected,
  onClick,
}: {
  row: any;
  rank?: number;
  share?: number;
  dimension: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`m-top__row${selected ? ' is-selected' : ''}${rank != null ? ' has-rank' : ''}`}
      >
        {rank != null && <span className="m-top__rank">{rank}</span>}
        <span className="m-top__mark" aria-hidden="true">
          <RowMark dimension={dimension} row={row} />
        </span>
        <span className="m-top__label m-truncate" title={row.displayName}>
          {row.displayName}
        </span>
        <span className="m-top__bar" aria-hidden="true">
          <i style={{ width: `${Math.max(1.5, row.progress ?? 0)}%` }} />
        </span>
        <span className="m-top__value">
          {row.sessionCount}
          {share != null && (
            <span className="m-top__share">{pct(share * 100)}</span>
          )}
        </span>
      </button>
    </li>
  );
}

export default observer(SessionsBy);
