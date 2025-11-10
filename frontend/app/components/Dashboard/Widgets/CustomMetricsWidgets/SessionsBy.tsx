import React from 'react';
import { Button, Space, Empty } from 'antd';
import { Info, ArrowRight } from 'lucide-react';
import CardSessionsByList from 'Components/Dashboard/Widgets/CardSessionsByList';
import { useModal } from 'Components/ModalContext';
import Widget from '@/mstore/types/widget';
import { useTranslation } from 'react-i18next';
import { FilterKey } from 'Types/filter/filterType';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/mstore';

interface Props {
  metric?: any;
  data: any;
  onClick?: (filters: any) => void;
  isTemplate?: boolean;
}

function SessionsBy(props: Props) {
  const { metric = {}, data = { values: [] }, onClick = () => null } = props;
  const { t } = useTranslation();
  const { filterStore } = useStore();
  const [selected, setSelected] = React.useState<any>(null);
  const { total } = data;
  const { openModal, closeModal } = useModal();
  const modalMetric = React.useMemo(
    () => Object.assign(new Widget(), metric),
    [metric],
  );

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

  const showMore = (e: any) => {
    e.stopPropagation();
    openModal(
      <CardSessionsByList
        paginated
        metric={modalMetric}
        total={total}
        list={data.values}
        onClickHandler={(e, item) => {
          closeModal();
          onClickHandler(null, item);
        }}
        selected={selected}
      />,
      {
        title: metric.name,
        width: 600,
      },
    );
  };

  const numFmt = new Intl.NumberFormat('en-US');
  const moreMetrics = total > 3 ? numFmt.format(total - 3) : 0;
  return (
    <div>
      {data.values && data.values.length === 0 ? (
        <Empty
          image={null}
          style={{ minHeight: 220 }}
          className="flex flex-col items-center justify-center"
          imageStyle={{ height: 0 }}
          description={
            <div className="flex items-center gap-2 justify-center text-black">
              <Info size={14} />
              {t('No data available for the selected period.')}
            </div>
          }
        />
      ) : (
        <div
          className="flex flex-col justify-between w-full"
          style={{ height: 220 }}
        >
          {metric && (
            <CardSessionsByList
              list={data.values.slice(0, 3)}
              selected={selected}
              onClickHandler={onClickHandler}
            />
          )}
          {total > 3 && (
            <div className="flex">
              <Button type="link" onClick={showMore}>
                <Space className="flex font-medium gap-1 text-black hover:text-main">
                  {moreMetrics}&nbsp;{t('More')}
                  <ArrowRight size={16} />
                </Space>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default observer(SessionsBy);
