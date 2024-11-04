import React, { useState } from 'react';
import { Icon, BackLink, IconButton, Dropdown, Tooltip, TextEllipsis, Button } from 'UI';
import {
  remove as deleteFunnel,
  fetch,
  fetchInsights,
  fetchIssuesFiltered,
  fetchSessionsFiltered,
} from 'Duck/funnels';
import { editFilter, editFunnelFilter, refresh } from 'Duck/funnels';
import DateRange from 'Shared/DateRange';
import { connect } from 'react-redux';
import { confirm } from 'UI';
import FunnelSaveModal from 'Components/Funnels/FunnelSaveModal';
import stl from './funnelHeader.module.css';

const Info = ({ label = '', value = '', className = 'mx-4' }) => {
  return (
    <div className={className}>
      <span className="color-gray-medium">{label}</span>
      <span className="font-medium ml-2">{value}</span>
    </div>
  );
};

const FunnelHeader = (props) => {
  const {
    funnel,
    insights,
    funnels,
    onBack,
    funnelId,
    showFilters = false,
    funnelFilters,
    renameHandler,
  } = props;
  const [showSaveModal, setShowSaveModal] = useState(false);

  const writeOption = (e, { name, value }) => {
    props.redirect(value);
    props.fetch(value).then(() => props.refresh(value));
  };

  const deleteFunnel = async (e, funnel) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      await confirm({
        header: 'Delete Funnel',
        confirmButton: 'Delete',
        confirmation: `Are you sure you want to permanently delete "${funnel.name}"?`,
      })
    ) {
      props.deleteFunnel(funnel.funnelId).then(props.onBack);
    } else {
    }
  };

  const onDateChange = (e) => {
    props.editFunnelFilter(e, funnelId);
  };

  const options = funnels.map(({ funnelId, name }) => ({ text: name, value: funnelId })).toJS();
  const selectedFunnel = funnels.filter((i) => i.funnelId === parseInt(funnelId)).first() || {};
  const eventsCount = funnel.filter.filters.filter((i) => i.isEvent).size;

  return (
    <div>
      <div className="bg-white border rounded flex items-center w-full relative group pr-2">
        <BackLink
          onClick={onBack}
          vertical
          className="absolute"
          style={{ left: '-50px', top: '8px' }}
        />
        <FunnelSaveModal show={showSaveModal} closeHandler={() => setShowSaveModal(false)} />
        <div className="flex items-center mr-auto relative">
          <Dropdown
            scrolling
            trigger={
              <div
                className="text-xl capitalize font-medium"
                style={{ maxWidth: '300px', overflow: 'hidden' }}
              >
                <TextEllipsis text={selectedFunnel.name} />
              </div>
            }
            options={options}
            className={stl.dropdown}
            name="funnel"
            value={parseInt(funnelId)}
            // icon={null}
            onChange={writeOption}
            selectOnBlur={false}
            icon={
              <Icon name="chevron-down" color="gray-dark" size="14" className={stl.dropdownIcon} />
            }
          />
          <Info label="Events" value={eventsCount} />
          <span>-</span>
          <Button variant="text-primary" onClick={props.toggleFilters}>
            {showFilters ? 'HIDE' : 'EDIT FUNNEL'}
          </Button>
          <Info label="Sessions" value={insights.sessionsCount} />
          <Info label="Conversion" value={`${insights.conversions}%`} />
        </div>
        <div className="flex items-center">
          <div className="flex items-center invisible group-hover:visible">
            <Tooltip title={`Edit Funnel`}>
              <IconButton icon="edit" onClick={() => setShowSaveModal(true)} />
            </Tooltip>
            <Tooltip title={`Remove Funnel`}>
              <IconButton
                icon="trash"
                onClick={(e) => deleteFunnel(e, funnel)}
                className="ml-2 mr-2"
              />
            </Tooltip>
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
  );
};

export default connect(
  (state) => ({
    funnelFilters: state.getIn(['funnels', 'funnelFilters']).toJS(),
    funnel: state.getIn(['funnels', 'instance']),
  }),
  {
    editFilter,
    editFunnelFilter,
    deleteFunnel,
    fetch,
    fetchInsights,
    fetchIssuesFiltered,
    fetchSessionsFiltered,
    refresh,
  }
)(FunnelHeader);
