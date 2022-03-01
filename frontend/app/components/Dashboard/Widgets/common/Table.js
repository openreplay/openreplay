import cn from 'classnames';
import { Button } from 'UI';
import stl from './table.css';

export default class Table extends React.PureComponent {
  state = { showAll: false };

  onLoadMoreClick = () => {
    this.setState({ showAll: true });
  }

  render() {
    const {
      cols,
      rows = [],
      rowProps,
      rowClass = '',
      small = false,
      compare = false,
      maxHeight = 200,
    } = this.props;
    const { showAll } = this.state;
    
    return (
      <div className="w-full">
        <div className="flex">
          {
            cols.map(({
              key, title, width,
            }) =>
              <div key={ key } style={ { width } } className={ stl.header }>{ title }</div>)
          }
        </div>
        <div className={ cn(stl.content, "thin-scrollbar") } style={{ maxHeight: maxHeight + 'px'}}>
          { rows.take(showAll ? 10 : (small ? 3 : 5)).map(row => (
            <div className={ cn(rowClass, stl.row, { [stl.small]: small}) } key={ row.key }>
              { cols.map(({ cellClass = '', className = '', Component, key, toText = t => t, width }) => (
                <div className={ cn(stl.cell, cellClass) } style={{ width }} key={ key }> { Component
                  ? <Component compare={compare} data={ row } { ...rowProps } />
                  : <div className={ cn(stl.text, className) }> { toText(row[ key ]) } </div>
                  }
                </div>
              )) }
            </div>
          )) }          
        </div>
        { rows.size > (small ? 3 : 5) && !showAll &&
            <div className="w-full flex justify-center mt-3">
              <Button
                onClick={ this.onLoadMoreClick }
                plain
                small
                className="text-center"
              >
                { 'Load More' }
              </Button>
            </div>
          }
      </div>
    );
  }
}
