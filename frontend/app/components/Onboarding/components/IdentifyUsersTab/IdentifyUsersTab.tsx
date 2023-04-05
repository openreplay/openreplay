import React from 'react';
import CircleNumber from '../CircleNumber';
import MetadataList from '../MetadataList/MetadataList';
import { HighlightCode, Icon } from 'UI';
import DocCard from 'Shared/DocCard/DocCard';

export default function IdentifyUsersTab() {
  return (
    <>
      <h1 className="flex items-center px-4 py-3 border-b text-2xl">
        <span>🕵️‍♂️</span>
        <div className="ml-3">Identify Users</div>
      </h1>
      <div className="grid grid-cols-6 gap-4 w-full p-4">
        <div className="col-span-4">
          <div>
            <div className="font-medium mb-2 text-lg">Identify users by user ID</div>
            <div className="mb-2">
              Call <span className="highlight-blue">setUserID</span> to identify your users when
              recording a session.
            </div>
          </div>

          <div className="flex items-center my-2">
            <Icon name="info-circle" color="gray-darkest" />
            <span className="ml-2">OpenReplay keeps the last communicated user ID.</span>
          </div>

          <HighlightCode className="js" text={`tracker.setUserID('john@doe.com');`} />
          <div className="border-t my-8" />

          <div className="my-8" />
          <div>
            <div className="font-medium mb-2 text-lg">Identify users by adding metadata</div>
            <p>
              To identify users through metadata, you will have to explicitly specify your user
              metadata so it can be injected during sessions. Follow the below steps
            </p>
            <div className="flex items-start">
              <CircleNumber text="1" />
              <MetadataList />
            </div>

            <div className="my-6" />
            <div className="flex items-start">
              <CircleNumber text="2" />
              <div className="pt-1">
                <span className="font-bold">Inject metadata when recording sessions</span>
                <div className="my-2">
                  Use the <span className="highlight-blue">setMetadata</span> method in your code to
                  inject custom user data in the form of a key/value pair (string).
                </div>
                <HighlightCode className="js" text={`tracker.setMetadata('plan', 'premium');`} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <DocCard
            title="Why to identify users?"
            icon="question-lg"
            iconBgColor="bg-red-lightest"
            iconColor="red"
          >
            Make it easy to search and filter replays by user id. OpenReplay allows you to associate
            your internal-user-id with the recording.
          </DocCard>

          <DocCard title="What is Metadata?" icon="lightbulb">
            Additional information about users can be provided with metadata (also known as traits
            or user variables). They take the form of key/value pairs, and are useful for filtering
            and searching for specific session replays.
          </DocCard>
        </div>
      </div>
    </>
  );
}
