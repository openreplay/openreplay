import React from 'react';
import SlackChannelList from './SlackChannelList/SlackChannelList';

const SlackForm = (props) => {
    const { onEdit } = props;
    return (
        <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
            <h3 className="p-5 text-2xl">Slack</h3>
            <SlackChannelList onEdit={onEdit} />
        </div>
    );
};

SlackForm.displayName = 'SlackForm';

export default SlackForm;
