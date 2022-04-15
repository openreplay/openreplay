import React, { useEffect } from 'react';
import { NoContent } from 'UI';
import { Styles, AvgLabel } from '../../common';
import Scale from './Scale';
import { threeLetter } from 'App/constants/countries';
import { colorScale } from 'App/utils';
import { observer } from 'mobx-react-lite';
import { numberWithCommas } from 'App/utils';
import WorldMap from "@svg-maps/world";
import { SVGMap } from "react-svg-map";
import "react-svg-map/lib/index.css";
import stl from './SpeedIndexByLocation.css';

interface Props {
    metric?: any
}
function SpeedIndexByLocation(props: Props) {
    const { metric } = props;
    const wrapper: any = React.useRef(null);
    let map: any = null;

    const getSeries = data => {
      const series: any[] = [];
      data.forEach(item => {
        const d = [threeLetter[item.userCountry], Math.round(item.avg)]
        series.push(d)
      })

      return series;
    }

    useEffect(() => {
      // if (!wrapper && !wrapper.current) return
      
    }, [])

    // useEffect(() => {
    //   if (map && map.updateChoropleth) {
    //     const series = getSeries(metric.data.chart);
    //     // console.log('series', series)
    //     // map.updateChoropleth(series, {reset: true});
    //   }
    // }, [])

    const getDataset = () => {
      const { metric } = props;
      const colors = Styles.colors;

      var dataset = {};
      const series = getSeries(metric.data.chart);
      var onlyValues = series.map(function(obj){ return obj[1]; });
      const paletteScale = colorScale(onlyValues, [...colors].reverse());

      // fill dataset in appropriate format
      series.forEach(function(item){
          var iso = item[0], value = item[1];
          dataset[iso] = { numberOfThings: value, fillColor: paletteScale(value) };
      });
      return dataset;
    }

    const getLocationClassName = (location, index) => {
      // Generate random heat map
      return `svg-map__location svg-map__location--heat${index % 4}`;
    }

    return (
        <NoContent
          size="small"
          show={ metric.data.chart.length === 0 }
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
                locationClassName={stl.location}
                // onLocationMouseOver={(e) => console.log(e.target)}
              />
            </div>
            {/* <div className="examples__block__map__tooltip" style={this.state.tooltipStyle}>
						  {this.state.pointedLocation}
					  </div> */}
        </NoContent>
    );
}

export default observer(SpeedIndexByLocation);