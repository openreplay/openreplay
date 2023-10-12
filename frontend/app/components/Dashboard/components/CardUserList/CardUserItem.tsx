import React from 'react';
import { Icon } from 'UI';
interface Props {
    user: any
}
function CardUserItem(props: Props) {
    const { user } = props;
    return (
        <div className="flex items-center py-2 hover:bg-active-blue cursor-pointer">
            <div className="mr-auto flex items-center">
                <div className="flex items-center justify-center flex-shrink-0 mr-2 relative">
                    <div className="w-8 h-8 rounded-full flex items-center bg-tealx-light justify-center">
                        <Icon name="person-fill" size="15" className="z-10 inset-0" color="tealx" />
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    {user.name}
                    {/* <span className="color-gray-medium mx-2">some-button</span> */}
                </div>
            </div>
            <div className="flex items-center">
                <div className="mr-2 link">{user.sessions}</div>
                <div><Icon name="chevron-right" size="16" /></div>
            </div>
        </div>
    );
}

export default CardUserItem;