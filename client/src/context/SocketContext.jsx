import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { SOCKET_URL } from '../api/config';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { user, token } = useContext(AuthContext);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (token && !socket) {
            const newSocket = io(SOCKET_URL, {
                query: { token }
            });

            newSocket.on('connect', () => {
                console.log('Socket connected');
            });

            setSocket(newSocket);

            return () => newSocket.close();
        } else if (!token && socket) {
            socket.close();
            setSocket(null);
        }
    }, [token]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
