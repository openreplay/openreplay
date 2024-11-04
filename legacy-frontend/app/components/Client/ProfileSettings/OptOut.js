import React from 'react'
import { connect } from 'react-redux';
import { Checkbox } from 'UI'
import { updateClient } from 'Duck/user'

function OptOut(props) {
  const { optOut } = props;
  const onChange = () => {
    props.updateClient({ optOut: !optOut })
  }
  return (
    <div>
      <Checkbox
        name="isPublic"
        className="font-medium"
        type="checkbox"
        checked={ optOut }
        onClick={ onChange }
        className="mr-8"
        label="Anonymize"
      />
    </div>
  )
}

export default connect(state => ({
  optOut: state.getIn([ 'user', 'account', 'optOut' ]),
}), { updateClient })(OptOut);
