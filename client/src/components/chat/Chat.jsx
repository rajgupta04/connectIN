import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../layout/Layout';
import { getConversations, getMessages, sendMessage } from '../../api/chat';
import { useSocket } from '../../context/SocketContext';
import { ArrowLeft, Phone, Send, User, Video } from 'lucide-react';
import moment from 'moment';
import { AuthContext } from '../../context/AuthContext';
import CallOverlay from './CallOverlay';
import { toast } from 'react-toastify';
import { startRingtone, stopRingtone } from '../../lib/ringtone';

const Chat = () => {
    const socket = useSocket();
    const { user } = useContext(AuthContext);
    const [conversations, setConversations] = useState([]);
    const [currentChat, setCurrentChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const scrollRef = useRef();

    const [incomingCall, setIncomingCall] = useState(null); // { fromUserId, callType, channelName }
    const [outgoingCall, setOutgoingCall] = useState(null); // { toUserId, callType, channelName }
    const [activeCall, setActiveCall] = useState(null); // { peerId, callType, channelName }

    const conversationById = useMemo(() => {
        const map = new Map();
        conversations.forEach((c) => map.set(c._id, c));
        return map;
    }, [conversations]);

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const res = await getConversations();
                setConversations(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchConversations();
    }, []);

    useEffect(() => {
        const fetchMessages = async () => {
            if (currentChat) {
                try {
                    const res = await getMessages(currentChat._id);
                    setMessages(res.data);
                } catch (err) {
                    console.error(err);
                }
            }
        };
        fetchMessages();
    }, [currentChat]);

    useEffect(() => {
        if (!socket) return;

        socket.on('receive_message', (data) => {
            if (currentChat && data.from === currentChat._id) {
                setMessages((prev) => [...prev, data.message]);
            } else {
                // Optional: Update conversation list to show unread badge or move to top
            }
        });

        socket.on('call_invite', (data) => {
            const incoming = {
                fromUserId: data.fromUserId,
                callType: data.callType,
                channelName: data.channelName
            };

            setIncomingCall(incoming);

            const callerName = conversationById.get(incoming.fromUserId)?.name;
            toast.info(`Incoming ${incoming.callType === 'audio' ? 'audio' : 'video'} call${callerName ? ` from ${callerName}` : ''}`);

            // Ring (may be blocked until user interaction on some mobile browsers)
            startRingtone();

            // Browser notification when tab is not visible
            try {
                if (document.hidden && 'Notification' in window) {
                    if (Notification.permission === 'granted') {
                        new Notification('Incoming call', {
                            body: callerName ? `${callerName} is calling you` : 'You have an incoming call'
                        });
                    } else if (Notification.permission === 'default') {
                        Notification.requestPermission().then((perm) => {
                            if (perm === 'granted') {
                                new Notification('Incoming call', {
                                    body: callerName ? `${callerName} is calling you` : 'You have an incoming call'
                                });
                            }
                        });
                    }
                }
            } catch (e) {
                // Ignore notification failures
            }
        });

        socket.on('call_accepted', (data) => {
            setOutgoingCall((prev) => {
                if (!prev) return prev;
                if (prev.channelName !== data.channelName) return prev;
                setActiveCall({
                    peerId: prev.toUserId,
                    callType: prev.callType,
                    channelName: prev.channelName
                });
                return null;
            });
        });

        socket.on('call_rejected', (data) => {
            setOutgoingCall((prev) => {
                if (!prev) return prev;
                if (prev.channelName !== data.channelName) return prev;
                return null;
            });
        });

        socket.on('call_ended', (data) => {
            setActiveCall((prev) => {
                if (!prev) return prev;
                if (prev.channelName !== data.channelName) return prev;
                return null;
            });
            setIncomingCall(null);
            setOutgoingCall(null);
            stopRingtone();
        });

        return () => {
            socket.off('receive_message');
            socket.off('call_invite');
            socket.off('call_accepted');
            socket.off('call_rejected');
            socket.off('call_ended');
            stopRingtone();
        };
    }, [socket, currentChat, conversationById]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentChat) return;

        try {
            const res = await sendMessage(currentChat._id, newMessage);
            setMessages([...messages, res.data]);
            setNewMessage('');
        } catch (err) {
            console.error(err);
        }
    };

    const createChannelName = () => {
        // Agora channelName must be <= 64 bytes and limited charset.
        // Keep it short and predictable enough for debugging.
        const time = Date.now().toString(36);
        const rand = Math.random().toString(36).slice(2, 10);
        return `c_${time}_${rand}`; // e.g. c_m2k3z1_4f8a9bcd
    };

    const startCall = (callType) => {
        if (!socket || !currentChat) return;
        const channelName = createChannelName();
        setOutgoingCall({ toUserId: currentChat._id, callType, channelName });
        socket.emit('call_invite', { toUserId: currentChat._id, callType, channelName });
    };

    const acceptIncomingCall = () => {
        if (!socket || !incomingCall) return;
        socket.emit('call_accept', {
            toUserId: incomingCall.fromUserId,
            callType: incomingCall.callType,
            channelName: incomingCall.channelName
        });
        setActiveCall({
            peerId: incomingCall.fromUserId,
            callType: incomingCall.callType,
            channelName: incomingCall.channelName
        });
        setIncomingCall(null);
        stopRingtone();
    };

    const rejectIncomingCall = () => {
        if (!socket || !incomingCall) return;
        socket.emit('call_reject', {
            toUserId: incomingCall.fromUserId,
            channelName: incomingCall.channelName
        });
        setIncomingCall(null);
        stopRingtone();
    };

    const endActiveCall = () => {
        if (!socket || !activeCall) {
            setActiveCall(null);
            return;
        }
        socket.emit('call_end', {
            toUserId: activeCall.peerId,
            channelName: activeCall.channelName
        });
        setActiveCall(null);
        stopRingtone();
    };

    return (
        <Layout>
            <CallOverlay
                isOpen={!!activeCall}
                callType={activeCall?.callType}
                channelName={activeCall?.channelName}
                onEnd={endActiveCall}
                peerName={conversationById.get(activeCall?.peerId)?.name}
                peerAvatarUrl={conversationById.get(activeCall?.peerId)?.avatarUrl}
            />

            {incomingCall && (
                <div className="mb-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">
                            Incoming {incomingCall.callType === 'audio' ? 'audio' : 'video'} call
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            From {conversationById.get(incomingCall.fromUserId)?.name || 'a connection'}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={acceptIncomingCall}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                        >
                            Accept
                        </button>
                        <button
                            type="button"
                            onClick={rejectIncomingCall}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium"
                        >
                            Reject
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-[calc(100vh-120px)] flex overflow-hidden transition-colors duration-200">
                {/* Sidebar */}
                <div className={`w-full md:w-1/3 border-r border-gray-100 dark:border-gray-700 flex flex-col ${currentChat ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Messages</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {conversations.map((c) => (
                            <div
                                key={c._id}
                                onClick={() => setCurrentChat(c)}
                                className={`p-4 flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                    currentChat?._id === c._id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                                }`}
                            >
                                <img
                                    src={c.avatarUrl || 'https://via.placeholder.com/40'}
                                    alt=""
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                <div className="min-w-0">
                                    <h4 className="font-semibold text-gray-900 dark:text-white">{c.name}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.headline}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`flex-1 flex flex-col ${currentChat ? 'flex' : 'hidden md:flex'}`}>
                    {currentChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
                                <div className="flex items-center space-x-3 min-w-0">
                                <button
                                    type="button"
                                    onClick={() => setCurrentChat(null)}
                                    className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    aria-label="Back to conversations"
                                >
                                    <ArrowLeft size={20} className="text-gray-700 dark:text-gray-200" />
                                </button>
                                <img
                                    src={currentChat.avatarUrl || 'https://via.placeholder.com/40'}
                                    alt=""
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                <div className="min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white">{currentChat.name}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
                                </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => startCall('audio')}
                                        disabled={!!outgoingCall || !!activeCall}
                                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
                                        aria-label="Start audio call"
                                    >
                                        <Phone size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => startCall('video')}
                                        disabled={!!outgoingCall || !!activeCall}
                                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
                                        aria-label="Start video call"
                                    >
                                        <Video size={18} />
                                    </button>
                                </div>
                            </div>

                            {outgoingCall && outgoingCall.toUserId === currentChat._id && (
                                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between gap-3">
                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                        Calling…
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            socket?.emit('call_end', { toUserId: outgoingCall.toUserId, channelName: outgoingCall.channelName });
                                            setOutgoingCall(null);
                                        }}
                                        className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                                {messages.map((m) => (
                                    <div
                                        key={m._id}
                                        ref={scrollRef}
                                        className={`flex ${
                                            m.sender === currentChat._id ? 'justify-start' : 'justify-end'
                                        }`}
                                    >
                                        <div
                                            className={`max-w-[85%] sm:max-w-[70%] p-3 rounded-2xl text-sm ${
                                                m.sender === currentChat._id
                                                    ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-600 rounded-tl-none'
                                                    : 'bg-indigo-600 text-white rounded-tr-none'
                                            }`}
                                        >
                                            <p>{m.content}</p>
                                            <p className={`text-[10px] mt-1 text-right ${
                                                m.sender === currentChat._id ? 'text-gray-400 dark:text-gray-400' : 'text-indigo-200'
                                            }`}>
                                                {moment(m.createdAt).format('LT')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Input */}
                            <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        className="flex-1 p-3 border border-gray-200 dark:border-gray-600 rounded-full focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-transparent dark:text-white"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                <User size={40} />
                            </div>
                            <p className="text-lg">Select a conversation to start chatting</p>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Chat;
