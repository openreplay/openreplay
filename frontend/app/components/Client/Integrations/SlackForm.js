import React from 'react';
import SlackChannelList from './SlackChannelList/SlackChannelList';

const SlackForm = (props) => {
  const { onEdit } = props;
  return (
    <>
      <SlackChannelList onEdit={onEdit} />
    </>
  )
}

SlackForm.displayName = "SlackForm";

export default SlackForm;