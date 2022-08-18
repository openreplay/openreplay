import React from 'react';
import { connect } from 'react-redux';
import { NoContent } from 'UI';
import { remove, edit, init } from 'Duck/integrations/slack';
import DocLink from 'Shared/DocLink/DocLink';

function SlackChannelList(props) {
    const { list } = props;

    const onEdit = (instance) => {
        props.edit(instance);
        props.onEdit();
    };

    return (
        <div className="mt-6">
            <NoContent
                title={
                    <div className="p-5 mb-4">
                        <div className="text-base text-left">
                            Integrate Slack with OpenReplay and share insights with the rest of the team, directly from the recording page.
                        </div>
                        <DocLink className="mt-4 text-base" label="Integrate Slack" url="https://docs.openreplay.com/integrations/slack" />
                    </div>
                }
                size="small"
                show={list.size === 0}
            >
                {list.map((c) => (
                    <div
                        key={c.webhookId}
                        className="border-t px-5 py-2 flex items-center justify-between cursor-pointer hover:bg-active-blue"
                        onClick={() => onEdit(c)}
                    >
                        <div className="flex-grow-0" style={{ maxWidth: '90%' }}>
                            <div>{c.name}</div>
                            <div className="truncate test-xs color-gray-medium">{c.endpoint}</div>
                        </div>
                    </div>
                ))}
            </NoContent>
        </div>
    );
}

export default connect(
    (state) => ({
        list: state.getIn(['slack', 'list']),
    }),
    { remove, edit, init }
)(SlackChannelList);
