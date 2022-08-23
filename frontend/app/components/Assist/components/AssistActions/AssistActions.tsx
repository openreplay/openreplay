import React, { useState, useEffect } from 'react';
import { Popup, Icon, Button, IconButton } from 'UI';
import logger from 'App/logger';
import { connect } from 'react-redux';
import cn from 'classnames';
import { toggleChatWindow } from 'Duck/sessions';
import { connectPlayer } from 'Player/store';
import ChatWindow from '../../ChatWindow';
import { callPeer, setCallArgs, requestReleaseRemoteControl, toggleAnnotation } from 'Player';
import { CallingState, ConnectionStatus, RemoteControlStatus } from 'Player/MessageDistributor/managers/AssistManager';
import RequestLocalStream from 'Player/MessageDistributor/managers/LocalStream';
import type { LocalStream } from 'Player/MessageDistributor/managers/LocalStream';

import { toast } from 'react-toastify';
import { confirm } from 'UI';
import stl from './AassistActions.module.css';

function onReject() {
    toast.info(`Call was rejected.`);
}

function onError(e) {
    console.log(e)
    toast.error(typeof e === 'string' ? e : e.message);
}

interface Props {
    userId: String;
    toggleChatWindow: (state) => void;
    calling: CallingState;
    annotating: boolean;
    peerConnectionStatus: ConnectionStatus;
    remoteControlStatus: RemoteControlStatus;
    hasPermission: boolean;
    isEnterprise: boolean;
    isCallActive: boolean;
    agentIds: string[];
}

function AssistActions({
    toggleChatWindow,
    userId,
    calling,
    annotating,
    peerConnectionStatus,
    remoteControlStatus,
    hasPermission,
    isEnterprise,
    isCallActive,
    agentIds
}: Props) {
    const [isPrestart, setPrestart] = useState(false);
    const [incomeStream, setIncomeStream] = useState<MediaStream[] | null>([]);
    const [localStream, setLocalStream] = useState<LocalStream | null>(null);
    const [callObject, setCallObject] = useState<{ end: () => void } | null>(null);

    const onCall = calling === CallingState.OnCall || calling === CallingState.Reconnecting;
    const cannotCall = peerConnectionStatus !== ConnectionStatus.Connected || (isEnterprise && !hasPermission);
    const remoteActive = remoteControlStatus === RemoteControlStatus.Enabled;

    useEffect(() => {
        return callObject?.end()
    }, [])

    useEffect(() => {
        if (peerConnectionStatus == ConnectionStatus.Disconnected) {
            toast.info(`Live session was closed.`);
        }
    }, [peerConnectionStatus]);

    const addIncomeStream = (stream: MediaStream) => {
        setIncomeStream(oldState => [...oldState, stream]);
    }

    function call(agentIds?: string[]) {
        RequestLocalStream().then(lStream => {
            setLocalStream(lStream);
            setCallArgs(
                lStream,
                addIncomeStream,
                lStream.stop.bind(lStream),
                onReject,
                onError
            )
            setCallObject(callPeer());
            if (agentIds) {
                callPeer(agentIds)
            }
        }).catch(onError)
    }

    React.useEffect(() => {
        if (!onCall && isCallActive && agentIds) {
            setPrestart(true);
            call(agentIds)
        }
    }, [agentIds, isCallActive])

    const confirmCall = async () => {
        if (
            await confirm({
                header: 'Start Call',
                confirmButton: 'Call',
                confirmation: `Are you sure you want to call ${userId ? userId : 'User'}?`,
            })
        ) {
            call();
        }
    };

    return (
        <div className="flex items-center">
            {(onCall || remoteActive) && (
                <>
                    <div
                        className={cn('cursor-pointer p-2 flex items-center', { [stl.disabled]: cannotCall })}
                        onClick={() => toggleAnnotation(!annotating)}
                        role="button"
                    >
                        <Button
                            icon={annotating ? 'pencil-stop' : 'pencil'}
                            variant={annotating ? 'text-red' : 'text-primary'}
                            style={{ height: '28px' }}
                        >
                            Annotate
                        </Button>
                        {/* <IconButton label={`Annotate`} icon={annotating ? 'pencil-stop' : 'pencil'} primaryText redText={annotating} /> */}
                    </div>
                    <div className={stl.divider} />
                </>
            )}
            <div
                className={cn('cursor-pointer p-2 flex items-center', { [stl.disabled]: cannotCall })}
                onClick={requestReleaseRemoteControl}
                role="button"
            >
                <Button
                    icon={remoteActive ? 'window-x' : 'remote-control'}
                    variant={remoteActive ? 'text-red' : 'text-primary'}
                    style={{ height: '28px' }}
                >
                    Remote Control
                </Button>
                {/* <IconButton label={`Remote Control`} icon={remoteActive ? 'window-x' : 'remote-control'} primaryText redText={remoteActive} /> */}
            </div>
            <div className={stl.divider} />

            <Popup content={cannotCall ? `You don't have the permissions to perform this action.` : `Call ${userId ? userId : 'User'}`}>
                <div
                    className={cn('cursor-pointer p-2 flex items-center', { [stl.disabled]: cannotCall })}
                    onClick={onCall ? callObject?.end : confirmCall}
                    role="button"
                >
                    <Button icon="headset" variant={onCall ? 'text-red' : 'primary'} style={{ height: '28px' }}>
                        {onCall ? 'End' : 'Call'}
                    </Button>
                    {/* <IconButton size="small" primary={!onCall} red={onCall} label={onCall ? 'End' : 'Call'} icon="headset" /> */}
                </div>
            </Popup>

            <div className="fixed ml-3 left-0 top-0" style={{ zIndex: 999 }}>
                {onCall && callObject && (
                    <ChatWindow endCall={callObject.end} userId={userId} incomeStream={incomeStream} localStream={localStream} isPrestart={isPrestart} />
                )}
            </div>
        </div>
    );
}

const con = connect(
    (state) => {
        const permissions = state.getIn(['user', 'account', 'permissions']) || [];
        return {
            hasPermission: permissions.includes('ASSIST_CALL'),
            isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
        };
    },
    { toggleChatWindow }
);

export default con(
    connectPlayer((state) => ({
        calling: state.calling,
        annotating: state.annotating,
        remoteControlStatus: state.remoteControl,
        peerConnectionStatus: state.peerConnectionStatus,
    }))(AssistActions)
);
