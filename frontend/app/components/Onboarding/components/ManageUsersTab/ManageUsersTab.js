import UsersView from 'App/components/Client/Users/UsersView';
import DocCard from 'Shared/DocCard/DocCard';
import React from 'react';
import { Button, Icon } from 'UI';

export default function ManageUsersTab() {
  return (
    <>
      <h1 className="flex items-center px-4 py-3 border-b text-2xl">
        <span>👨‍💻</span>
        <div className="ml-3">Invite Collaborators</div>
      </h1>
      <div className="grid grid-cols-6 gap-4 p-4">
        <div className="col-span-4">
          <UsersView isOnboarding={true} />
        </div>
        <div className="col-span-2">
          <DocCard
            title="Why Invite Collaborators?"
            icon="question-lg"
            iconBgColor="bg-red-lightest"
            iconColor="red"
          >
            <p>Come together and unlock the potential collaborative improvements!</p>
            <p>
              Session replays are useful to developers, designers, product managers and to everyone
              on the product team.
            </p>
          </DocCard>
        </div>
      </div>
      <div className="border-t px-4 py-3 flex justify-end">
        <Button variant="primary" className="">
          Identify Users
          <Icon name="arrow-right-short" color="white" size={20} />
        </Button>
      </div>
    </>
  );
}
