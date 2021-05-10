import React, { useState } from 'react';
import { connect } from 'react-redux';
import { SlideModal } from 'UI';
import { fetchList, init } from 'Duck/rehydrate';
import SessionCaptureRate from '../../../SessionCaptureRate';

const RehydrateSlidePanel = props => {
  const { onClose, list, isModalDisplayed = true, users } = props;
  const [showDetail, setShowDetail] = useState(false)

  list.map(job => job.user = users.filter(user => user.id === job.createdBy).first())

  const showDetailsForm = (job) => {
    props.init(job);
    setShowDetail(true);
  }

  return (
    <SlideModal
      title={
        <div className="flex items-center">
          <span className="mr-3">{ 'Sessions Capture Rate' }</span>
        </div>
      }      
      isDisplayed={ isModalDisplayed }
      onClose={ onClose }
      size="small"
      content={
        isModalDisplayed && (
        <div className="px-4">
          <hr className="mb-3" />
          <div>
            <div className="my-3 mb-6">{ 'What percentage of your user sessions do you want to record and monitor?' }</div>
            <SessionCaptureRate onClose={ onClose } />
          </div>          
        </div>
        )
      }      
    />
  );
};

export default connect(state => ({
  list: state.getIn(['rehydrate', 'list']),
  users: state.getIn([ 'members', 'list' ]).filter(u => u.id),  
}), { fetchList, init })(RehydrateSlidePanel);
