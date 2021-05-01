import React from 'react' 
import ManageUsers from '../../../Client/ManageUsers'

export default function ManageUsersTab() {
  return (
    <div className="flex pt-8 -mx-4">
      <div className="w-8/12 px-4">
        <h1 className="text-3xl font-bold flex items-center mb-4">
          <span>👨‍💻</span>
          <div className="ml-3">Invite Collaborators</div>
        </h1>
        
        <ManageUsers hideHeader />
      
      </div>
      <div className="w-4/12 py-6">
        <div className="p-5 bg-gray-lightest mb-4 rounded">
          <div className="font-bold mb-2">Why Invite Collaborators?</div>
          <div className="text-sm">Session replay is useful for all team members, from developers, testers and product managers to design, support and marketing folks. Invite them all and start improving your app now.</div>
        </div>
      </div>
    </div>
  )
}
