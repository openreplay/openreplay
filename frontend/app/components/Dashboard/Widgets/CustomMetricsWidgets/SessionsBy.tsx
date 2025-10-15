import React from 'react';
import { Button, Space, Empty } from 'antd';
import { filtersMap } from 'Types/filter/newFilter';
import { Info, ArrowRight } from 'lucide-react';
import CardSessionsByList from 'Components/Dashboard/Widgets/CardSessionsByList';
import { useModal } from 'Components/ModalContext';
import Widget from '@/mstore/types/widget';
import { useTranslation } from 'react-i18next';
import { FilterKey } from 'Types/filter/filterType';
import { observer } from 'mobx-react-lite';

interface Props {
  metric?: any;
  data: any;
  onClick?: (filters: any) => void;
  isTemplate?: boolean;
}

function SessionsBy(props: Props) {
  const { metric = {}, data = { values: [] }, onClick = () => null } = props;
  const { t } = useTranslation();
  const [selected, setSelected] = React.useState<any>(null);
  const { total } = data;
  const { openModal, closeModal } = useModal();
  const modalMetric = React.useMemo(
    () => Object.assign(new Widget(), metric),
    [metric],
  );

  const onClickHandler = (_: any, data: any) => {
    onClick([]);
    setTimeout(() => {
      const baseFilter = {
        ...filtersMap[metric.metricOf],
        value: [data.name],
        name: filtersMap[metric.metricOf].key,
        propertyOrder: 'and',
        filters: [],
      };

      if (metric.metricOf === FilterKey.FETCH) {
        baseFilter.filters = [
          {
            key: FilterKey.FETCH_URL,
            operator: 'is',
            value: [data.name],
            propertyOrder: 'and',
            name: FilterKey.FETCH_URL,
          },
        ];
      }

      const {
        key,
        operatorOptions,
        category,
        icon,
        label,
        options,
        ...finalFilter
      } = baseFilter;

      setSelected(data.name);
      onClick([finalFilter]);
    }, 0);
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
