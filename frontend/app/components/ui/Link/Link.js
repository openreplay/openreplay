import React from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import cn from 'classnames';
import { withSiteId } from 'App/routes';
import styles from './link.module.css';

const OpenReplayLink = ({ siteId, to, className="", dispatch, ...other })  => (
  <Link 
    { ...other } 
    className={ cn(className, styles.link , 'px-2', 'hover:text-inherit') }
    to={ withSiteId(to, siteId) }
  />
);

OpenReplayLink.displayName = 'OpenReplayLink';

export default connect((state, props) => ({ 
	siteId: props.siteId || state.getIn([ 'site', 'siteId' ])
}))(OpenReplayLink);