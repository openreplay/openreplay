import React, { useEffect } from 'react';
import { NoContent } from 'UI';
import { Styles, AvgLabel } from '../../common';
import Scale from './Scale';
import { threeLetter } from 'App/constants/countries';
// import { colorScale } from 'App/utils';
import { observer } from 'mobx-react-lite';
import { numberWithCommas } from 'App/utils';
import WorldMap from "@svg-maps/world";
import { SVGMap } from "react-svg-map";
import "react-svg-map/lib/index.css";
import stl from './SpeedIndexByLocation.css';
import cn from 'classnames';

const getPercentageOfAverage = (data, value: number) => {
  const avg = data.reduce((acc, item) => acc + item.avg, 0) / data.length;
  return Math.round((value / avg) * 100);
}

const numberPartBetweenRange = (value: any, max: number) => {
  const minPart = value * max / 100
  return Math.round(minPart);
}

interface Props {
    metric?: any
}
function SpeedIndexByLocation(props: Props) {
    const { metric } = props;
    const wrapper: any = React.useRef(null);
    let map: any = null;
    const [tooltipStyle, setTooltipStyle] = React.useState({ display: 'none' });
    const [pointedLocation, setPointedLocation] = React.useState<any>(null);
    const dataMap = React.useMemo(() => {
        const data = {};
        metric.data.chart.forEach((item: any) => {
            item.percentage = getPercentageOfAverage(metric.data.chart, item.avg);
            item.perNumber = numberPartBetweenRange(item.percentage, 5);
            data[item.userCountry.toLowerCase()] = item;
        });
        return data;
    }, [])

    // const getSeries = data => {
    //   const series: any[] = [];
    //   data.forEach(item => {
    //     const d = [threeLetter[item.userCountry], Math.round(item.avg)]
    //     series.push(d)
    //   })

    //   return series;
    // }

    const getLocationClassName = (location, index) => {
      const i = (dataMap[location.id] ? dataMap[location.id].perNumber : 0);
      const cls = stl["heat_index" + i];
      return cn(stl.location, cls);
    }

    const getLocationName = (event) => {
      if (!event) return null
      const id = event.target.attributes.id.value;
      const name = event.target.attributes.name.value;
      const percentage = dataMap[id] ? dataMap[id].perNumber : 0;
      return { name, id, percentage }
    }

    const handleLocationMouseOver = (event) => {
      const pointedLocation = getLocationName(event);
      setPointedLocation(pointedLocation);
    }
  
    const handleLocationMouseOut = () => {
      setTooltipStyle({ display: 'none' });
      setPointedLocation(null);
    }

    const handleLocationMouseMove = (event) => {
      const tooltipStyle = {
        display: 'block',
        top: event.clientY + 10,
        left: event.clientX - 100
      };
      setTooltipStyle(tooltipStyle);
    }

    return (
        <NoContent
          size="small"
          show={ false }
          style={ { height: '240px' } }
          className="relative"
        >
            <div className="absolute right-0 mr-4 top=0 w-full flex justify-end">
              <AvgLabel text="Avg" count={Math.round(metric.data.avg)} unit="ms" />
            </div>
            <Scale colors={Styles.colors} />
            <div className="map-target"></div>
            <div
              style={{
                height: '220px',
                width: '100%',
                margin: '0 auto',
                display: 'flex',
              }}
              ref={ wrapper }
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
                  <div>Avg: <strong>{dataMap[pointedLocation.id] ? numberWithCommas(parseInt(dataMap[pointedLocation.id].avg)) : 0}</strong></div>
                </>
              )}
					  </div>
        </NoContent>
    );
}

export default observer(SpeedIndexByLocation);