import React from 'react'
import { connect } from 'react-redux'

function Licenses({ account }) {
  return (
    <div>
      <div>{account.license}</div>
      {account.expirationDate && (
        <div className="">
          (Expires on {account.expirationDate.toFormat('LLL dd, yyyy')})
        </div>
      )}
    </div>
  )
}

export default connect(state => ({
  account: state.getIn([ 'user', 'account' ]),
}))(Licenses)
