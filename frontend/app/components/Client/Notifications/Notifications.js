import React, { useEffect } from 'react'
import cn from 'classnames'
import stl from './notifications.css'
import { Checkbox } from 'UI'
import { connect } from 'react-redux'
import { withRequest } from 'HOCs'
import { fetch as fetchConfig, edit as editConfig, save as saveConfig } from 'Duck/config'
import withPageTitle from 'HOCs/withPageTitle';

function Notifications(props) {
  const { config } = props;

  useEffect(() => {
    props.fetchConfig();
  }, [])

  const onChange = () => {
    const _config = { 'weeklyReport' : !config.weeklyReport };
    props.editConfig(_config);
    props.saveConfig(_config)
  }

  return (
    <div className={ stl.wrapper }>
      <div className={ stl.tabHeader }>
        { <h3 className={ cn(stl.tabTitle, "text-2xl") }>{ 'Notifications' }</h3> }        
      </div>
      <div className="flex items-start">
        <Checkbox
          name="isPublic"
          className="font-medium"
          type="checkbox"
          checked={ config.weeklyReport }
          onClick={ onChange }
          className="mr-8"
          label="Send me a weekly report for each project."
        />
        <img src="/img/img-newsletter.png" style={{ width: '400px'}}/>
      </div>
    </div>
  )
}

export default connect(state => ({
  config: state.getIn(['config', 'options'])
}), { fetchConfig, editConfig, saveConfig })(withPageTitle('Notifications - OpenReplay Preferences')(Notifications));
