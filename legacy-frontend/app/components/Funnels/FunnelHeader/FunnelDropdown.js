import React from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router'
import { Dropdown } from 'UI'
import { funnel as funnelRoute, withSiteId } from 'App/routes';

function FunnelDropdown(props) {  
  const { options, funnel } = props;

  const writeOption = (e, { name, value }) => {
    const { siteId, history } = props;
    history.push(withSiteId(funnelRoute(parseInt(value)), siteId));
  }

  return (
    <div>
      <Dropdown
        selection
        basic          
        options={ options.toJS() }
        name="funnel"
        value={ funnel.funnelId || ''}
        defaultValue={ funnel.funnelId }
        icon={null}
        style={{ border: 'none' }}
        onChange={ writeOption }
        selectOnBlur={false}
      />
    </div>
  )
}

export default connect((state, props) => ({
  funnels: state.getIn(['funnels', 'list']),
  funnel: state.getIn(['funnels', 'instance']),
  siteId: state.getIn([ 'site', 'siteId' ]),
}), { })(withRouter(FunnelDropdown))
