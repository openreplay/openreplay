import UsersView from 'App/components/Client/Users/UsersView';
import React from 'react';

export default function ManageUsersTab() {
  return (
    <div className="">
      <h1 className="flex items-center mb-4 px-4 py-3 border-b text-2xl">
        <span>👨‍💻</span>
        <div className="ml-3">Invite Collaborators</div>
      </h1>
      <div className="w-8/12 px-4">
        <UsersView isOnboarding={true} />
      </div>
      <div className="w-4/12 py-6">
        <div className="p-5 bg-gray-lightest mb-4 rounded">
          <div className="font-bold mb-2">Why Invite Collaborators?</div>
          <div className="text-sm">
            Session replay is useful for all team members, from developers, testers and product
            managers to design, support and marketing folks. Invite them all and start improving
            your app now.
          </div>
        </div>
      </div>
    </div>
  );
}
