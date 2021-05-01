import cn from 'classnames';
import { TYPES } from 'Types/filter/event';
import { SENTRY, DATADOC } from 'Types/session/stackEvent';
import { LEVEL } from 'Types/session/log';      // TODO: no types mess
import { Icon } from 'UI';

import styles from './typeBadge.css';

function getText(type, source) {
  if (type === TYPES.CLICK) return 'Click';
  if (type === TYPES.LOCATION) return 'URL';
  if (type === TYPES.INPUT) return 'Input';
  if (type === TYPES.CONSOLE) return 'Console';
  if (type === TYPES.GRAPHQL) return 'GraphQL';
  if (type === TYPES.ERROR) return 'Error';
  if (type === TYPES.STATEACTION) return 'Store Action';
  if (type === TYPES.FETCH) return 'Fetch';
  if (type === TYPES.REVID) return 'Rev ID';
  if (type === TYPES.METADATA) return 'Metadata';
  if (type === TYPES.CUSTOM) {
    if (!source) return 'Custom';
		return (
			<React.Fragment > 
				<Icon name={ `integrations/${ source }` } size="12" inline className={ cn(styles.icon, "mr-5") } /> 
				{ 'Custom' }
			</React.Fragment>
		);
  }
  return '?';
}

const TypeBadge = ({ event: { type, level, source } }) => (
  <div 
    className={ cn(styles.badge, {
      [ styles.red ]: level === LEVEL.ERROR || level === LEVEL.EXCEPTION,
      [ styles.yellow ]: level === LEVEL.WARN,
    }) } 
  >
    { getText(type, source) }
  </div>
);

TypeBadge.displayName = 'TypeBadge';

export default TypeBadge;
