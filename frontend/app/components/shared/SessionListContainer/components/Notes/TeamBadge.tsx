import React from 'react'
import { Icon } from 'UI'

export default function TeamBadge() {
  return (
    <>
      <Icon name="user-friends" className="ml-2 mr-1" color="gray-dark" />
      <span className="text-disabled-text">Team</span>
    </>
  )
}
