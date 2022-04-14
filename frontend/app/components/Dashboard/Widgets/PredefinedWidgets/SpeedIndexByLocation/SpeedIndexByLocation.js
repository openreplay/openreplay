import React, { useEffect } from 'react';
import { NoContent } from 'UI';
import { Styles, AvgLabel } from '../../common';
import Scale from './Scale';
import { threeLetter } from 'App/constants/countries';
import { colorScale } from 'App/utils';
import { observer } from 'mobx-react-lite';
import * as DataMap from "datamaps";
import { numberWithCommas } from 'App/utils';

// interface Props {
//     metric?: any
// }
function SpeedIndexByLocation(props) {
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
      if (wrapper.current && !map && metric.data.chart.length > 0) {
        const dataset = getDataset();
        map = new DataMap({
          element: wrapper.current,
          fills: { defaultFill: '#E8E8E8' },
          data: dataset,
          // responsive: true,
          // height: null, //if not null, datamaps will grab the height of 'element'
          // width: null, //if not null, datamaps will grab the width of 'element'
          geographyConfig: {
            borderColor: '#FFFFFF',
            borderWidth: 0.5,
            highlightBorderWidth: 1,
            popupOnHover: true,
            // don't change color on mouse hover
            highlightFillColor: function(geo) {
              return '#999999';
              // return geo['fillColor'] || '#F5F5F5';
            },
            // only change border
            highlightBorderColor: '#B7B7B7',
            // show desired information in tooltip
            popupTemplate: function(geo, data) {
                // don't show tooltip if country don't present in dataset
                if (!data) { return ; }
                // tooltip content
                return ['<div class="hoverinfo speedIndexPopup">',
                    '<strong>', geo.properties.name, '</strong>',
                    '<span>Avg: <strong>', numberWithCommas(data.numberOfThings), '</strong><span>',
                    '</div>'].join('');
            }
          }
        });
      }
    }, [])

    // useEffect(() => {
    //   if (map) {
    //     map.updateChoropleth(getSeries(metric.data.chart), { reset: true});
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

    return (
        <NoContent
          size="small"
          show={ metric.data.chart.length === 0 }
          style={ { height: '240px' } }
        >
            <div className="w-full flex justify-end">
              <AvgLabel text="Avg" count={Math.round(metric.data.avg)} unit="ms" />
            </div>
            <Scale colors={Styles.colors} />
            <div
              style={{
                height: '220px',
                width: '90%',
                margin: '0 auto',
                display: 'flex',
              }}
              ref={ wrapper }
            />
        </NoContent>
    );
}

export default observer(SpeedIndexByLocation);