import React from 'react';
import { useCall } from '../../context/CallContext';
import IncomingCallModal from './IncomingCallModal';
import CallOverlay from '../chat/CallOverlay';

const GlobalCallUI = () => {
  const {
    incomingCall,
    canAcceptIncoming,
    activeCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endCall
  } = useCall();

  return (
    <>
      <IncomingCallModal
        isOpen={!!incomingCall && canAcceptIncoming}
        callerName={incomingCall?.fromUserName}
        callerAvatarUrl={incomingCall?.fromAvatarUrl}
        callType={incomingCall?.callType}
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
      />

      <CallOverlay
        isOpen={!!activeCall}
        callType={activeCall?.callType}
        channelName={activeCall?.channelName}
        onEnd={endCall}
        peerName={activeCall?.peerName}
        peerAvatarUrl={activeCall?.peerAvatarUrl}
      />
    </>
  );
};

export default GlobalCallUI;
