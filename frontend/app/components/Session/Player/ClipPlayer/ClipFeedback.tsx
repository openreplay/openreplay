import React, {useRef} from 'react';
import {App, Button, ButtonProps} from "antd";
import {useStore} from "@/mstore";
import {observer} from "mobx-react-lite";
import {Tour, TourProps} from ".store/antd-virtual-7db13b4af6/package";
import {DislikeFilled, DislikeOutlined, LikeFilled, LikeOutlined} from "@ant-design/icons";

interface Props {
    clip?: any
}

function ClipFeedback(props: Props) {
    const {clipStore} = useStore();
    const currentClip = clipStore.currentClip;
    const ref1 = useRef(null);
    const {message} = App.useApp();

    const steps: TourProps['steps'] = [
        {
            title: 'Upload File',
            description: 'Put your files here.',
            cover: (
                <div>
                    <Button>Upload</Button>
                </div>
            ),
            target: () => ref1.current,
        },
    ];

    const interestStatus = currentClip?.interested;
    const disabled = interestStatus != null
    const isInterestedProps: ButtonProps = interestStatus === true ? {
        color: "primary",
        variant: "outlined",
        icon: <LikeFilled/>,
    } : {
        icon: <LikeOutlined/>,
        onClick: () => submitFeedback(true)
    };

    const isNotInterestedProps: ButtonProps = interestStatus === false ? {
        color: "primary",
        variant: "outlined",
        icon: <DislikeFilled/>,
    } : {
        icon: <DislikeOutlined/>,
        onClick: () => submitFeedback(false)
    };

    // if (disabled) {
    //     isInterestedProps.disabled = true;
    //     isNotInterestedProps.disabled = true;
    // } else {
    //     isInterestedProps.disabled = false;
    //     isNotInterestedProps.disabled = false;
    // }

    const submitFeedback = async (isInterested: boolean) => {
        await clipStore.sendFeedback(isInterested).then(() => {
            message.success('Your feedback has been submitted');
        }).catch(() => {
            message.error('There was an error submitting your feedback');
        });
    };

    return (
        <div className="absolute right-0 bottom-0 z-10 flex flex-col gap-4 mr-4" style={{marginBottom: '1rem'}}>
            {clipStore.tour && <Tour open={clipStore.tour} steps={steps} onClose={() => clipStore.toggleTour()}/>}
            <Button
                ref={ref1}
                shape="circle"
                {...isInterestedProps}
            />
            <Button
                shape="circle"
                {...isNotInterestedProps}
            />
        </div>
    );
}

export default observer(ClipFeedback);
