import React from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from 'App/mstore'

function Licenses() {
  const { userStore } = useStore()
  const account = userStore.account
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

export default observer(Licenses)
