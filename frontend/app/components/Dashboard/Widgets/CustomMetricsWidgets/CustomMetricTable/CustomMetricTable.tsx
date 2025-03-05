import React from 'react';
import { List } from 'immutable';
import { filtersMap } from 'Types/filter/newFilter';
import { NoContent, Icon } from 'UI';
import { tableColumnName } from 'App/constants/filterOptions';
import { numberWithCommas } from 'App/utils';
import { Table } from '../../common';
import { useTranslation } from 'react-i18next';

const getColumns = (metric) => [
  {
    key: 'name',
    title: tableColumnName[metric.metricOf],
    toText: (name) => name || 'Unidentified',
    width: '70%',
    icon: true,
  },
  {
    key: 'sessionCount',
    title: 'Sessions',
    toText: (sessions) => numberWithCommas(sessions),
    width: '30%',
  },
];

interface Props {
  metric?: any;
  data: any;
  onClick?: (filters: any) => void;
  isTemplate?: boolean;
}

function CustomMetricTable(props: Props) {
  const {
    metric = {},
    data = { values: [] },
    onClick = () => null,
    isTemplate,
  } = props;
  const { t } = useTranslation();
  const rows = List(data.values);

  const onClickHandler = (event: any, data: any) => {
    const filters = Array<any>();
    const filter = { ...filtersMap[metric.metricOf] };
    filter.value = [data.name];
    filter.type = filter.key;
    delete filter.key;
    delete filter.operatorOptions;
    delete filter.category;
    delete filter.icon;
    delete filter.label;
    delete filter.options;

    filters.push(filter);
    onClick(filters);
  };
  return (
    <div className="" style={{ height: 240 }}>
      <NoContent
        style={{ minHeight: 220 }}
        show={data.values && data.values.length === 0}
        size="small"
        title={
          <div className="flex items-center">
            <Icon name="info-circle" className="mr-2" size="14" />
            {t('No data available for the selected period.')}
          </div>
        }
      >
        <Table
          small
          cols={getColumns(metric)}
          rows={rows}
          rowClass="group"
          onRowClick={onClickHandler}
          isTemplate={isTemplate}
        />
      </NoContent>
    </div>
  );
}

export default CustomMetricTable;
