import { widgetHOC, AvgLabel, Styles } from '../common';
import * as DataMap from "datamaps";
import { threeLetter } from 'App/constants/countries';
import Scale from './Scale';
import { numberWithCommas } from 'App/utils';
import stl from './speedIndexLocation.css';
import { colorScale } from 'App/utils';

@widgetHOC('speedLocation', { fitContent: false })
export default class SpeedIndexLocation extends React.PureComponent {  
  wrapper = React.createRef()
  map = null;

  getSeries = data => {
    const series = [];
    data.chart.forEach(item => {
      const d = [threeLetter[item.userCountry], Math.round(item.avg)]
      series.push(d)
    })

    return series;
  }

  componentDidUpdate(prevProps) {
    if (this.map) {
      this.map.updateChoropleth(this.getDataset(), { reset: true});
    }
  }

  getDataset = () => {
    const { data, compare } = this.props;
    const colors = compare ? Styles.compareColors : Styles.colors;

    var dataset = {};
    const series = this.getSeries(data);
    var onlyValues = series.map(function(obj){ return obj[1]; });
    const paletteScale = colorScale(onlyValues, [...colors].reverse());

    // fill dataset in appropriate format
    series.forEach(function(item){
        var iso = item[0], value = item[1];
        dataset[iso] = { numberOfThings: value, fillColor: paletteScale(value) };
    });
    return dataset;
  }

  render() {
    const { data, loading, compare = false } = this.props;
    
    
    if (this.wrapper.current && !this.map && data.chart.length > 0) {
      const dataset = this.getDataset();
      this.map = new DataMap({
        element: this.wrapper.current,
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
  
    return (      
      <>
        <div className="w-full flex justify-end">
          <AvgLabel text="Avg" count={Math.round(data.avg)} unit="ms" />
        </div>
        <Scale colors={compare ? Styles.compareColors : Styles.colors} />
        <div className={stl.mapWrapper} ref={ this.wrapper } />
      </>      
    );
  }
}
