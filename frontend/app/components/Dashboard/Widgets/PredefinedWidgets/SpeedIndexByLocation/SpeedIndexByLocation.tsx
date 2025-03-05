import React from 'react';
import { NoContent } from 'UI';
import { observer } from 'mobx-react-lite';
import { numberWithCommas, positionOfTheNumber } from 'App/utils';
import WorldMap from '@svg-maps/world';
import { SVGMap } from 'react-svg-map';
import cn from 'classnames';
import { NO_METRIC_DATA } from 'App/constants/messages';
import { InfoCircleOutlined } from '@ant-design/icons';
import stl from './SpeedIndexByLocation.module.css';
import Scale from './Scale';
import { Styles, AvgLabel } from '../../common';
import { useTranslation } from 'react-i18next';

interface Props {
  data?: any;
}

function SpeedIndexByLocation(props: Props) {
  const { t } = useTranslation();
  const { data } = props;
  const wrapper: any = React.useRef(null);
  const [tooltipStyle, setTooltipStyle] = React.useState({ display: 'none' });
  const [pointedLocation, setPointedLocation] = React.useState<any>(null);

  const dataMap: any = React.useMemo(() => {
    const _data: any = {};
    const max = data.chart?.reduce(
      (acc: any, item: any) => Math.max(acc, item.value),
      0,
    );
    const min = data.chart?.reduce(
      (acc: any, item: any) => Math.min(acc, item.value),
      0,
    );
    data.chart?.forEach((item: any) => {
      if (!item || !item.userCountry) {
        return;
      }
      item.perNumber = positionOfTheNumber(min, max, item.value, 5);
      _data[item.userCountry.toLowerCase()] = item;
    });
    return _data;
  }, [data.chart]);

  const getLocationClassName = (location: any) => {
    const i = dataMap[location.id] ? dataMap[location.id].perNumber : 0;
    const cls = stl[`heat_index${i}`];
    return cn(stl.location, cls);
  };

  const getLocationName = (event: any) => {
    if (!event) return null;
    const id = event.target.attributes.id.value;
    const name = event.target.attributes.name.value;
    const percentage = dataMap[id] ? dataMap[id].perNumber : 0;
    return { name, id, percentage };
  };

  const handleLocationMouseOver = (event: any) => {
    const pointedLocation = getLocationName(event);
    setPointedLocation(pointedLocation);
  };

  const handleLocationMouseOut = () => {
    setTooltipStyle({ display: 'none' });
    setPointedLocation(null);
  };

  const handleLocationMouseMove = (event: any) => {
    const tooltipStyle = {
      display: 'block',
      top: event.clientY + 10,
      left: event.clientX - 100,
    };
    setTooltipStyle(tooltipStyle);
  };

  return (
    <NoContent
      size="small"
      show={false}
      style={{ height: '240px' }}
      title={
        <div className="flex items-center gap-2 text-base font-normal">
          <InfoCircleOutlined size={12} /> {NO_METRIC_DATA}
        </div>
      }
    >
      <div className="absolute right-0 mr-4 top=0 w-full flex justify-end">
        <AvgLabel text="Avg" count={Math.round(data.value)} unit="ms" />
      </div>
      <Scale colors={Styles.compareColors} />
      <div className="map-target" />
      <div
        style={{
          height: '234px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
        }}
        ref={wrapper}
      >
        <SVGMap
          map={WorldMap}
          className={stl.maps}
          locationClassName={getLocationClassName}
          onLocationMouseOver={handleLocationMouseOver}
          onLocationMouseOut={handleLocationMouseOut}
          onLocationMouseMove={handleLocationMouseMove}
        />
      </div>
      <div className={stl.tooltip} style={tooltipStyle}>
        {pointedLocation && (
          <>
            <div>{pointedLocation.name}</div>
            <div>
              {t('Avg:')}{' '}
              <strong>
                {dataMap[pointedLocation.id]
                  ? numberWithCommas(
                      parseInt(dataMap[pointedLocation.id].value),
                    )
                  : 0}
              </strong>
            </div>
          </>
        )}
      </div>
    </NoContent>
  );
}

export default observer(SpeedIndexByLocation);
