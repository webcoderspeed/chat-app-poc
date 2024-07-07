import io from 'socket.io-client';

const socketInit = () => {
	return io(import.meta.env.VITE_APP_SOCKET_APP_URL, {
		reconnectionAttempts: Infinity,
		timeout: 10000,
		transports: ['websocket'],
		forceNew: true,
	});
};

export default socketInit;
