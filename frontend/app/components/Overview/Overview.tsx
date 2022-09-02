import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import NoSessionsMessage from 'Shared/NoSessionsMessage';
import MainSearchBar from 'Shared/MainSearchBar';
import SessionSearch from 'Shared/SessionSearch';
import SessionListContainer from 'Shared/SessionListContainer/SessionListContainer';

function Overview() {
    return (
        <div className="page-margin container-90 flex relative">
            <div className="flex-1 flex">
                <div className={'w-full mx-auto'} style={{ maxWidth: '1300px' }}>
                    <NoSessionsMessage />

                    <div className="mb-5">
                        <MainSearchBar />
                        <SessionSearch />

                        <div className="my-4" />
                        <SessionListContainer />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default withPageTitle('Sessions - OpenReplay')(Overview);
