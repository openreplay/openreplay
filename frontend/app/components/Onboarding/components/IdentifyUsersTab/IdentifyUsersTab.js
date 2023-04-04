import React from 'react';
import CircleNumber from '../CircleNumber';
import MetadataList from '../MetadataList/MetadataList';
import { HighlightCode } from 'UI';

export default function IdentifyUsersTab() {
  return (
    <div className="">
      <h1 className="flex items-center mb-4 px-4 py-3 border-b text-2xl">
        <span>🕵️‍♂️</span>
        <div className="ml-3">Identify Users</div>
      </h1>
      <div className="w-8/12 px-4">
        <div>
          <div className="font-bold mb-4 text-lg">By User ID</div>
          <div className="mb-2">
            Call <span className="highlight-gray">setUserID</span> to identify your users when
            recording a session. The identity of the user can be changed, but OpenReplay will only
            keep the last communicated user ID.
          </div>
          <HighlightCode className="js" text={`tracker.setUserID('john@doe.com');`} />
        </div>

        <div className="my-8" />
        <div>
          <div className="font-bold mb-4 text-lg">By adding metadata</div>
          <div className="flex items-start">
            <CircleNumber text="1" />
            <div className="pt-1">
              <span className="font-bold">Explicitly specify the metadata</span>
              <div className="my-2">You can add up to 10 keys.</div>
              <div className="my-2" />

              <MetadataList />
            </div>
          </div>

          <div className="my-6" />
          <div className="flex items-start">
            <CircleNumber text="2" />
            <div className="pt-1">
              <span className="font-bold">Inject metadata when recording sessions</span>
              <div className="my-2">
                Use the <span className="highlight-gray">setMetadata</span> method in your code to
                inject custom user data in the form of a key/value pair (string).
              </div>
              <HighlightCode className="js" text={`tracker.setMetadata('plan', 'premium');`} />
            </div>
          </div>
        </div>
      </div>

      <div className="my-8" />
      <div className="w-4/12 py-6">
        <div className="p-5 bg-gray-lightest mb-4 rounded">
          <div className="font-bold mb-2">Why Identify Users?</div>
          <div className="text-sm">
            Make it easy to search and filter replays by user id. OpenReplay allows you to associate
            your internal-user-id with the recording.
          </div>
        </div>

        <div className="p-5 bg-gray-lightest mb-4 rounded">
          <div className="font-bold mb-2">What is Metadata?</div>
          <div className="text-sm">
            Additional information about users can be provided with metadata (also known as traits
            or user variables). They take the form of key/value pairs, and are useful for filtering
            and searching for specific session replays.
          </div>
        </div>
      </div>
    </div>
  );
}
