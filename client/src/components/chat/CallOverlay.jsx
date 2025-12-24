import React, { useEffect, useMemo, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { PhoneOff, Video, Mic } from 'lucide-react';
import { AGORA_APP_ID } from '../../api/config';
import { getRtcToken } from '../../api/agora';

const CallOverlay = ({
  isOpen,
  callType,
  channelName,
  onEnd,
  peerName,
  peerAvatarUrl
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState(null);

  const client = useMemo(() => {
    return AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let localAudioTrack;
    let localVideoTrack;
    let mounted = true;

    const cleanup = async () => {
      try {
        client.removeAllListeners();
      } catch (_) {
        // ignore
      }

      try {
        if (localVideoTrack) {
          localVideoTrack.stop();
          localVideoTrack.close();
        }
        if (localAudioTrack) {
          localAudioTrack.stop();
          localAudioTrack.close();
        }
      } catch (_) {
        // ignore
      }

      try {
        await client.leave();
      } catch (_) {
        // ignore
      }
    };

    const start = async () => {
      try {
        setError(null);
        setStatus('connecting');

        if (!AGORA_APP_ID) {
          throw new Error('Missing VITE_AGORA_APP_ID');
        }
        if (!channelName) {
          throw new Error('Missing channelName');
        }

        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (!mounted) return;

          if (mediaType === 'video' && remoteVideoRef.current) {
            user.videoTrack?.play(remoteVideoRef.current);
          }
          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }

          setStatus('in-call');
        });

        client.on('user-left', async () => {
          if (!mounted) return;
          setStatus('ended');
          onEnd?.();
        });

        const tokenRes = await getRtcToken({ channelName, callType });
        const { token, userAccount } = tokenRes.data;

        await client.join(AGORA_APP_ID, channelName, token, userAccount);

        localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        if (callType === 'video') {
          localVideoTrack = await AgoraRTC.createCameraVideoTrack();
        }

        const tracksToPublish = [localAudioTrack].filter(Boolean);
        if (localVideoTrack) tracksToPublish.push(localVideoTrack);

        await client.publish(tracksToPublish);

        if (localVideoTrack && localVideoRef.current) {
          localVideoTrack.play(localVideoRef.current);
        }

        if (!mounted) return;
        setStatus('ringing');
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError(err?.message || 'Failed to start call');
        setStatus('error');
      }
    };

    start();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [isOpen, channelName, callType, client, onEnd]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={peerAvatarUrl || 'https://via.placeholder.com/40'}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 dark:text-white truncate">
                {peerName || 'Call'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {callType === 'audio' ? 'Audio call' : 'Video call'} · {status}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onEnd}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <PhoneOff size={18} />
            <span className="hidden sm:inline">End</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900">
          <div className="rounded-xl overflow-hidden bg-black/80 aspect-video relative">
            <div ref={remoteVideoRef} className="w-full h-full" />
            <div className="absolute left-3 bottom-3 text-xs text-white/80 flex items-center gap-2">
              {callType === 'audio' ? <Mic size={14} /> : <Video size={14} />}
              <span>Remote</span>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden bg-black/80 aspect-video relative">
            {callType === 'video' ? (
              <div ref={localVideoRef} className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/70">
                <div className="text-center">
                  <div className="text-sm font-medium">Audio call</div>
                  <div className="text-xs">Microphone is on</div>
                </div>
              </div>
            )}
            <div className="absolute left-3 bottom-3 text-xs text-white/80">You</div>
          </div>
        </div>

        {error && (
          <div className="px-4 pb-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default CallOverlay;
