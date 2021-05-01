import { Loader } from 'semantic-ui-react';

export default ({ children = null, loading = true, size = 'tiny', ...props }) => (!loading ? children :
  <Loader size={ size } active={ loading } inline { ...props } />
)