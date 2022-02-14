import React, { useEffect, useState } from 'react';
import { Icon, BackLink, IconButton, Dropdown, Popup, TextEllipsis, Button } from 'UI';
import { remove as deleteFunnel, fetch, fetchInsights, fetchIssuesFiltered, fetchSessionsFiltered } from 'Duck/funnels';
import { applyFilter } from 'Duck/funnelFilters';
import DateRange from 'Shared/DateRange';
import { connect } from 'react-redux';
import { confirm } from 'UI/Confirmation';
import FunnelSaveModal from 'Components/Funnels/FunnelSaveModal';
import stl from './funnelHeader.css';

const Info = ({ label = '', value = '', className = 'mx-4' }) => {
  return (
    <div className={className}>      
      <span className="color-gray-medium">{label}</span>
      <span className="font-medium ml-2">{value}</span> 
    </div>
  )
}

const FunnelHeader = (props) => {
  const { funnelFilters, funnel, insights, funnels, onBack, funnelId, showFilters = false, renameHandler } = props;

  const [showSaveModal, setShowSaveModal] = useState(false)

  const writeOption = (e, { name, value }) => {    
    props.fetch(value)
    props.redirect(value)
  }

  useEffect(() => {
    if (funnel.funnelId && funnel.funnelId !== funnelId) {
      props.fetchInsights(funnel.funnelId, {})
      props.fetchIssuesFiltered(funnel.funnelId, {})
      props.fetchSessionsFiltered(funnel.funnelId, {})
    }
  }, [funnel])

  const deleteFunnel = async (e, funnel) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (await confirm({
        header: 'Delete Funnel',
        confirmButton: 'Delete',
        confirmation: `Are you sure you want to permanently delete "${funnel.name}"?`
    })) {
        props.deleteFunnel(funnel.funnelId).then(props.onBack);
    } else {}
  }
  
  const onDateChange = (e) => {    
    props.applyFilter(e, funnel.funnelId)
  }

  const options = funnels.map(({ funnelId, name }) => ({ text: name, value: funnelId })).toJS();
  const selectedFunnel = funnels.filter(i => i.funnelId === parseInt(funnelId)).first() || {};  

  return (
    <div>
      <div className="bg-white border rounded flex items-center w-full relative group pr-2">
        <BackLink onClick={onBack} vertical className="absolute" style={{ left: '-50px', top: '8px' }} />
        <FunnelSaveModal
          show={showSaveModal}
          closeHandler={() => setShowSaveModal(false)}
        />      
        <div className="flex items-center mr-auto relative">                  
          <Dropdown          
            scrolling
            trigger={
              <div className="text-xl capitalize font-medium" style={{ maxWidth: '300px', overflow: 'hidden'}}>
                <TextEllipsis text={selectedFunnel.name} />
              </div>
            }                 
            options={options}
            className={ stl.dropdown }
            name="funnel"
            value={ parseInt(funnelId) }
            icon={null}
            onChange={ writeOption }
            selectOnBlur={false}
            icon={ <Icon name="chevron-down" color="gray-dark" size="14" className={stl.dropdownIcon} /> }
          />
          <Info label="Events" value={funnel.filter.filters.size} />
          <span>-</span>
          <Button plain onClick={props.toggleFilters}>{ showFilters ? 'HIDE' : 'EDIT FUNNEL' }</Button>
          <Info label="Sessions" value={insights.sessionsCount} />          
          <Info label="Conversion" value={`${insights.conversions}%`} />
        </div>
        <div className="flex items-center">   
          <div className="flex items-center invisible group-hover:visible">
            <Popup
              trigger={<IconButton icon="edit" onClick={() => setShowSaveModal(true)} />}
              content={ `Edit Funnel` }
              size="tiny"
              inverted
              position="top center"
            />
            <Popup
              trigger={<IconButton icon="trash" onClick={(e) => deleteFunnel(e, funnel)} className="ml-2 mr-2" />}
              content={ `Remove Funnel` }
              size="tiny"
              inverted
              position="top center"
            />            
          </div>
          <DateRange
            rangeValue={funnelFilters.rangeValue}
            startDate={funnelFilters.startDate}
            endDate={funnelFilters.endDate}
            onDateChange={onDateChange}
            customRangeRight
          />
        </div>
      </div>
    </div>
  )
}

export default connect(state => ({
  funnelFilters: state.getIn([ 'funnels', 'instance', 'filter' ]),
}), { applyFilter, deleteFunnel, fetch, fetchInsights, fetchIssuesFiltered, fetchSessionsFiltered })(FunnelHeader)
