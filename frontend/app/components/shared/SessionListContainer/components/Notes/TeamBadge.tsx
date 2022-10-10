import React from 'react'
import { Icon } from 'UI'

export default function TeamBadge() {
  return (
    <div className="flex items-center ml-2">
      <Icon name="user-friends" className="mr-1" color="gray-dark" />
      <span className="text-disabled-text">Team</span>
    </div>
  )
}
