import React from 'react';
import { IconButton } from 'UI';
import { connect } from 'react-redux';
import { save } from 'Duck/funnels';

interface Props {
  save: typeof save;
  loading: boolean;
}
function UpdateFunnelButton(props: Props) {
  const { loading } = props;
  return (
    <div>
        <IconButton
            className="mr-2"
            disabled={loading}
            onClick={() => props.save()} primaryText label="UPDATE FUNNEL" icon="funnel"
        />
    </div>
  )
}

export default connect(state => ({
  loading: state.getIn(['funnels', 'saveRequest', 'loading']) ||
    state.getIn(['funnels', 'updateRequest', 'loading']),
}), { save })(UpdateFunnelButton);