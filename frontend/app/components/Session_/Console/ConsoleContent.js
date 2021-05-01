import cn from 'classnames';
import { getRE } from 'App/utils';
import { Icon, NoContent, Tabs, Input } from 'UI';
import { jump } from 'Player';
import { LEVEL } from 'Types/session/log'; 
import Autoscroll from '../Autoscroll';
import BottomBlock from '../BottomBlock';
import stl from './console.css';


const ALL = 'ALL';
const INFO = 'INFO';
const WARNINGS = 'WARNINGS';
const ERRORS = 'ERRORS';

const LEVEL_TAB = {
  [ LEVEL.INFO ]: INFO,
  [ LEVEL.LOG ]: INFO,
  [ LEVEL.WARNING ]: WARNINGS,
  [ LEVEL.ERROR ]: ERRORS,
  [ LEVEL.EXCEPTION ]: ERRORS,
};

const TABS = [ ALL, INFO, WARNINGS, ERRORS ].map(tab => ({ text: tab, key: tab }));

// eslint-disable-next-line complexity
const getIconProps = (level) => {
  switch (level) {
    case LEVEL.INFO:
    case LEVEL.LOG:
      return {
        name: 'console/info',
        color: 'blue2',
      };
    case LEVEL.WARN:
    case LEVEL.WARNING:
      return {
        name: 'console/warning',
        color: 'red2',
      };
    case LEVEL.ERROR:
      return {
        name: 'console/error',
        color: 'red',
      };    
        
  }  
  return null;
};

function renderWithNL(s = '') {
  if (typeof s !== 'string') return '';
  return s.split('\n').map((line, i) => <div className={ cn({ "ml-20": i !== 0 }) }>{ line }</div>)
}

export default class ConsoleContent extends React.PureComponent {
  state = {
    filter: '',
    activeTab: ALL,
  }
  onTabClick = activeTab => this.setState({ activeTab })
  onFilterChange = (e, { value }) => this.setState({ filter: value })

  render() {
    const { logs, isResult, additionalHeight, time } = this.props;
    const { filter, activeTab, currentError } = this.state;
    const filterRE = getRE(filter, 'i');
    const filtered = logs.filter(({ level, value }) => activeTab === ALL 
      ? filterRE.test(value) 
      : (filterRE.test(value) && LEVEL_TAB[ level ] === activeTab)
    );

    const lastIndex = filtered.filter(item => item.time <= time).length - 1;    

    return (
      <>
        <BottomBlock style={{ height: 300 + additionalHeight + 'px' }}>
          <BottomBlock.Header showClose={!isResult}>
            <Tabs 
              tabs={ TABS }
              active={ activeTab }
              onClick={ this.onTabClick }
              border={ false }              
            />
            <Input
              className="input-small"
              placeholder="Filter"
              icon="search"
              iconPosition="left"
              name="filter"
              onChange={ this.onFilterChange }
            />
          </BottomBlock.Header>
          <BottomBlock.Content>
            <NoContent
              size="small"
              show={ filtered.length === 0 }
            >
              <Autoscroll>
                { filtered.map((l, index) => (
                  <div 
                    key={ l.key }
                    className={ cn(stl.line, {
                      "info": !l.isYellow() && !l.isRed(),
                      "warn": l.isYellow(),
                      "error": l.isRed(),
                      "cursor-pointer": !isResult,
                      [stl.activeRow] : lastIndex === index
                    }) }
                    data-scroll-item={ l.isRed() }
                    onClick={ () => !isResult && jump(l.time) }
                  >
                    <Icon size="14" className={ stl.icon } { ...getIconProps(l.level) } />
                    <div className={ stl.message }>{ renderWithNL(l.value) }</div>
                  </div>
                ))}
              </Autoscroll>
            </NoContent>
          </BottomBlock.Content>
        </BottomBlock>
      </>
    );
  }
}