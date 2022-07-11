import React from 'react';
import { NoContent, Loader } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

interface Props {}
function SessionListContainer(props: Props) {
    return (
        <div className="widget-wrapper">
            <Loader loading={false}>
                <NoContent
                    title={
                        <div className="flex items-center justify-center flex-col">
                            <AnimatedSVG name={ICONS.NO_RESULTS} size={170} />
                            {/* {this.getNoContentMessage(activeTab)} */}
                        </div>
                    }
                    show={true}
                >
                    <div>No asdasdasdsd</div>
                </NoContent>
            </Loader>
        </div>
    );
}

export default SessionListContainer;
