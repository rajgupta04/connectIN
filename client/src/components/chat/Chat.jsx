import React, { useState, useEffect, useRef } from 'react';
import Layout from '../layout/Layout';
import { getConversations, getMessages, sendMessage } from '../../api/chat';
import { useSocket } from '../../context/SocketContext';
import { ArrowLeft, Send, User } from 'lucide-react';
import moment from 'moment';

const Chat = () => {
    const socket = useSocket();
    const [conversations, setConversations] = useState([]);
    const [currentChat, setCurrentChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const scrollRef = useRef();

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

        return () => {
            socket.off('receive_message');
        };
    }, [socket, currentChat]);

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

    return (
        <Layout>
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
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center space-x-3">
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
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{currentChat.name}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
                                </div>
                            </div>

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
