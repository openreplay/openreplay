import { Popup } from 'semantic-ui-react';

export default ({
  position, ...props
}) => (
  <Popup
    { ...props }
    position={ position || 'top left' }
  />
);
