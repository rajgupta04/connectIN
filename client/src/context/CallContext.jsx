import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSocket } from './SocketContext';
import { AuthContext } from './AuthContext';
import { startRingtone, stopRingtone } from '../lib/ringtone';

const CallContext = createContext(null);

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
};

const normalizeCallType = (value) => (value === 'audio' ? 'audio' : 'video');

const createChannelName = () => {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `c_${time}_${rand}`;
};

const notifyIncomingCall = async ({ callerName, callType }) => {
  try {
    if (!('Notification' in window)) return;

    const title = 'Incoming call';
    const body = `${callerName || 'A connection'} is calling you (${callType}).`;

    if (Notification.permission === 'granted') {
      // eslint-disable-next-line no-new
      new Notification(title, { body, silent: false });
      return;
    }

    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        // eslint-disable-next-line no-new
        new Notification(title, { body, silent: false });
      }
    }
  } catch (_) {
    // Notifications are best-effort; never break UI/routing.
  }
};

export const CallProvider = ({ children }) => {
  const socket = useSocket();
  const { user } = useContext(AuthContext);

  // { fromUserId, fromUserName, fromAvatarUrl, callType, channelName }
  const [incomingCall, setIncomingCall] = useState(null);

  // { toUserId, toUserName, toAvatarUrl, callType, channelName }
  const [outgoingCall, setOutgoingCall] = useState(null);

  // { peerId, peerName, peerAvatarUrl, callType, channelName }
  const [activeCall, setActiveCall] = useState(null);
  const [activeCallStartedAtMs, setActiveCallStartedAtMs] = useState(null);

  const canAcceptIncoming = useMemo(() => !!incomingCall && !activeCall, [incomingCall, activeCall]);

  const initiateCall = useCallback(
    ({ toUserId, callType, channelName, peerName, peerAvatarUrl }) => {
      if (!socket || !toUserId) return null;

      const normalizedType = normalizeCallType(callType);
      const chan = channelName || createChannelName();

      setOutgoingCall({
        toUserId,
        toUserName: peerName,
        toAvatarUrl: peerAvatarUrl,
        callType: normalizedType,
        channelName: chan
      });

      // New event (spec)
      socket.emit('call:initiate', {
        toUserId,
        callType: normalizedType,
        channelName: chan,
        fromUserName: user?.name,
        fromAvatarUrl: user?.avatarUrl
      });

      // Back-compat event (existing)
      socket.emit('call_invite', {
        toUserId,
        callType: normalizedType,
        channelName: chan
      });

      return chan;
    },
    [socket, user?.name, user?.avatarUrl]
  );

  const acceptIncomingCall = useCallback(() => {
    if (!socket || !incomingCall || activeCall) return;

    stopRingtone();

    socket.emit('call:accept', {
      toUserId: incomingCall.fromUserId,
      callType: incomingCall.callType,
      channelName: incomingCall.channelName
    });

    // Back-compat
    socket.emit('call_accept', {
      toUserId: incomingCall.fromUserId,
      callType: incomingCall.callType,
      channelName: incomingCall.channelName
    });

    setActiveCall({
      peerId: incomingCall.fromUserId,
      peerName: incomingCall.fromUserName,
      peerAvatarUrl: incomingCall.fromAvatarUrl,
      callType: incomingCall.callType,
      channelName: incomingCall.channelName
    });

    setActiveCallStartedAtMs(Date.now());

    setIncomingCall(null);
  }, [socket, incomingCall, activeCall]);

  const rejectIncomingCall = useCallback(() => {
    if (!socket || !incomingCall) return;

    stopRingtone();

    socket.emit('call:reject', {
      toUserId: incomingCall.fromUserId,
      callType: incomingCall.callType,
      channelName: incomingCall.channelName
    });

    // Back-compat
    socket.emit('call_reject', {
      toUserId: incomingCall.fromUserId,
      channelName: incomingCall.channelName
    });

    setIncomingCall(null);
  }, [socket, incomingCall]);

  const endCall = useCallback(() => {
    if (!socket) {
      setActiveCall(null);
      setIncomingCall(null);
      setOutgoingCall(null);
      setActiveCallStartedAtMs(null);
      stopRingtone();
      return;
    }

    const peerId = activeCall?.peerId || outgoingCall?.toUserId;
    const channelName = activeCall?.channelName || outgoingCall?.channelName;

    const hasActive = !!activeCall && !!activeCallStartedAtMs;
    const durationSeconds = hasActive
      ? Math.max(0, Math.floor((Date.now() - activeCallStartedAtMs) / 1000))
      : undefined;

    if (peerId && channelName) {
      socket.emit('call:end', {
        toUserId: peerId,
        channelName,
        callType: activeCall?.callType || outgoingCall?.callType,
        durationSeconds
      });
      // Back-compat
      socket.emit('call_end', { toUserId: peerId, channelName });
    }

    setActiveCall(null);
    setIncomingCall(null);
    setOutgoingCall(null);
    setActiveCallStartedAtMs(null);
    stopRingtone();
  }, [socket, activeCall, outgoingCall, activeCallStartedAtMs]);

  useEffect(() => {
    if (!socket) return;

    const onIncoming = async (data) => {
      if (!data?.channelName) return;
      if (activeCall) return;

      // Dedupe: if we receive both legacy + spec events for the same call.
      if (
        incomingCall &&
        incomingCall.channelName === data.channelName &&
        incomingCall.fromUserId === data.fromUserId
      ) {
        return;
      }

      const call = {
        fromUserId: data.fromUserId,
        fromUserName: data.fromUserName,
        fromAvatarUrl: data.fromAvatarUrl,
        callType: normalizeCallType(data.callType),
        channelName: data.channelName
      };

      setIncomingCall(call);

      // Audible/physical alert (best-effort; may be blocked until user gesture)
      startRingtone();

      // Try to show an OS-level notification even if tab is minimized.
      // Best-effort only; browsers may require permission/user gesture.
      await notifyIncomingCall({
        callerName: call.fromUserName,
        callType: call.callType
      });
    };

    const onAccepted = (data) => {
      setOutgoingCall((prev) => {
        if (!prev) return prev;
        if (prev.channelName !== data?.channelName) return prev;

        setActiveCall({
          peerId: prev.toUserId,
          peerName: prev.toUserName,
          peerAvatarUrl: prev.toAvatarUrl,
          callType: prev.callType,
          channelName: prev.channelName
        });

        setActiveCallStartedAtMs(Date.now());

        return null;
      });
    };

    const onRejected = (data) => {
      setOutgoingCall((prev) => {
        if (!prev) return prev;
        if (prev.channelName !== data?.channelName) return prev;
        return null;
      });
      stopRingtone();
    };

    const onEnded = (data) => {
      const chan = data?.channelName;

      setActiveCall((prev) => {
        if (!prev) return prev;
        if (chan && prev.channelName !== chan) return prev;
        return null;
      });

      setIncomingCall((prev) => {
        if (!prev) return prev;
        if (chan && prev.channelName !== chan) return prev;
        return null;
      });

      setOutgoingCall((prev) => {
        if (!prev) return prev;
        if (chan && prev.channelName !== chan) return prev;
        return null;
      });

      setActiveCallStartedAtMs((prev) => {
        // If this end matches current call, reset. If no channelName provided, reset anyway.
        if (!activeCall?.channelName || !chan || activeCall.channelName === chan) return null;
        return prev;
      });

      stopRingtone();
    };

    // Spec events
    socket.on('call:incoming', onIncoming);
    socket.on('call:accept', onAccepted);
    socket.on('call:reject', onRejected);
    socket.on('call:end', onEnded);

    // Back-compat events
    socket.on('call_invite', onIncoming);
    socket.on('call_accepted', onAccepted);
    socket.on('call_rejected', onRejected);
    socket.on('call_ended', onEnded);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accept', onAccepted);
      socket.off('call:reject', onRejected);
      socket.off('call:end', onEnded);

      socket.off('call_invite', onIncoming);
      socket.off('call_accepted', onAccepted);
      socket.off('call_rejected', onRejected);
      socket.off('call_ended', onEnded);
      stopRingtone();
    };
  }, [socket, activeCall, incomingCall]);

  const value = useMemo(
    () => ({
      incomingCall,
      outgoingCall,
      activeCall,
      canAcceptIncoming,
      initiateCall,
      acceptIncomingCall,
      rejectIncomingCall,
      endCall
    }),
    [
      incomingCall,
      outgoingCall,
      activeCall,
      canAcceptIncoming,
      initiateCall,
      acceptIncomingCall,
      rejectIncomingCall,
      endCall
    ]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};
