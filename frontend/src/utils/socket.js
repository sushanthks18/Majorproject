import { io } from 'socket.io-client';

export const getSocketBaseUrl = () => {
  // 1. Highest priority: Explicit environment variable for cloud/production backend
  if (import.meta.env.VITE_SOCKET_URL && import.meta.env.VITE_SOCKET_URL.trim() !== '') {
    return import.meta.env.VITE_SOCKET_URL.trim();
  }
  // 2. Custom manual IP configured in dashboard for offline LAN mode
  const customIp = typeof window !== 'undefined' ? localStorage.getItem('krishi_custom_server_ip') : null;
  if (customIp && customIp.trim() !== '') {
    const clean = customIp.trim().replace(/^https?:\/\//i, '').replace(/:\d+$/, '').replace(/\/.*$/, '');
    return `http://${clean}:5001`;
  }
  // 3. Localhost development fallback
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5001';
  }
  // 4. Dynamic hostname resolution (e.g. krishisakha.local or LAN IP accessing frontend)
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:5001`;
  }
  return window.location.origin;
};

let socket = null;

export const connectSocket = (userId) => {
  const targetUrl = getSocketBaseUrl();
  if (!socket) {
    socket = io(targetUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      if (userId) {
        socket.emit('join', userId);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const reconnectSocket = (userId) => {
  disconnectSocket();
  return connectSocket(userId);
};

export const getSocket = () => socket;

export default { connectSocket, disconnectSocket, getSocket, reconnectSocket };
