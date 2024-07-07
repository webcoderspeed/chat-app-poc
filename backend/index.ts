import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { SOCKET_ACTIONS } from './constants';

const app = express();

const httpServer = createServer(app);
const io = new Server(httpServer, {
	cors: { origin: '*', methods: ['GET', 'POST'] },
});

export type IUser = {
	id: string;
	name: string;
};

const users: Record<string, IUser> = {};

io.on('connection', (socket) => {
	console.log('new connection', socket.id);

	socket.on(SOCKET_ACTIONS.JOIN, ({ roomId, user }) => {
		users[socket.id] = user;

		console.log({rooms: socket.rooms, roomId})

		const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);

		clients.forEach((clientId) => {
			io.to(clientId).emit(SOCKET_ACTIONS.ADD_PEER, {
				peerId: socket.id,
				createOffer: false,
				remoteUser: user,
			});

			socket.emit(SOCKET_ACTIONS.ADD_PEER, {
				peerId: clientId,
				createOffer: true,
				remoteUser: users[clientId],
			});
		});

		socket.join(roomId);
		console.log({ clients });
	});

	//  handle ice relay
	socket.on(SOCKET_ACTIONS.RELAY_ICE, ({ peerId, icecandidate }) => {
		io.to(peerId).emit(SOCKET_ACTIONS.ICE_CANDIDATE, {
			peerId: socket.id,
			icecandidate,
		});
	});

	//  handle sdp relay
	socket.on(SOCKET_ACTIONS.RELAY_SDP, ({ peerId, sdp }) => {
		io.to(peerId).emit(SOCKET_ACTIONS.SESSION_DESCRIPTION, {
			peerId: socket.id,
			sdp,
		});
	});

	const handleLeaveRoom = () => {
		const { rooms } = socket;

		Array.from(rooms).forEach((roomId) => {
			const clients = Array.from(io.sockets.adapter.rooms.get(roomId) ?? []);

			clients.forEach((clientId) => {
				io.to(clientId).emit(SOCKET_ACTIONS.REMOVE_PEER, {
					peerId: socket.id,
					userId: users[socket.id]?.id,
				});

				socket.emit(SOCKET_ACTIONS.REMOVE_PEER, {
					peerId: clientId,
					userId: users[clientId]?.id,
				});
			});

			socket.leave(roomId);
		});

		delete users[socket.id];

	};

	socket.on(SOCKET_ACTIONS.LEAVE, handleLeaveRoom);

	socket.on('disconnect',  () => {
		console.log(`Disconnected`, socket.id);
	});

});

httpServer.listen(1337, () => console.log('Listening to server!'));
