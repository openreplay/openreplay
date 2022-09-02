import React, { useEffect } from 'react';
import cn from 'classnames';
import stl from './notifications.module.css';
import { Checkbox, Toggler } from 'UI';
import { connect } from 'react-redux';
import { withRequest } from 'HOCs';
import { fetch as fetchConfig, edit as editConfig, save as saveConfig } from 'Duck/config';
import withPageTitle from 'HOCs/withPageTitle';

function Notifications(props) {
    const { config } = props;

    useEffect(() => {
        props.fetchConfig();
    }, []);

    const onChange = () => {
        const _config = { weeklyReport: !config.weeklyReport };
        props.editConfig(_config);
        props.saveConfig(_config);
    };

    return (
        <div className="p-5">
            <div className={stl.tabHeader}>{<h3 className={cn(stl.tabTitle, 'text-2xl')}>{'Notifications'}</h3>}</div>
            <div className="">
                <div className="text-lg font-medium">Weekly project summary</div>
                <div className="mb-4">Receive wekly report for each project on email.</div>
                <Toggler checked={config.weeklyReport} name="test" onChange={onChange} label={config.weeklyReport ? 'Yes' : 'No'} />
                {/* <Checkbox
                    name="isPublic"
                    className="font-medium"
                    type="checkbox"
                    checked={config.weeklyReport}
                    onClick={onChange}
                    className="mr-8"
                    label="Send me a weekly report for each project."
                /> */}
                {/* <img src="/assets/img/img-newsletter.png" style={{ width: '400px'}}/> */}
            </div>
        </div>
    );
}

export default connect(
    (state) => ({
        config: state.getIn(['config', 'options']),
    }),
    { fetchConfig, editConfig, saveConfig }
)(withPageTitle('Notifications - OpenReplay Preferences')(Notifications));
