import { useCallback, useEffect, useRef } from 'react';
import { useStateWithCallback } from './useStateWithCallback';
import socketInit from '../utils/socket';
import { SOCKET_ACTIONS } from '../constants';

export type IUser = {
	id: string;
	name: string;
};

export function useWebRTC(roomId: string, user: IUser) {
	const [clients, setClients] = useStateWithCallback<IUser[]>([]);
	const audioElements = useRef<Record<string, HTMLAudioElement | null>>({});
	const connections = useRef<Record<string, RTCPeerConnection>>({});
	const localMediaStream = useRef<MediaStream | null>(null);
	const socketRef = useRef<ReturnType<typeof socketInit> | null>(null);

	useEffect(() => {
		socketRef.current = socketInit();

		return () => {
			socketRef.current?.disconnect();
		};
	}, []);

	const addNewClients = useCallback(
		(newClient: IUser, cb: () => void) => {
			const lookingFor = clients.find((client) => client.id === newClient.id);

			if (!lookingFor) {
				setClients((prev) => [...prev, newClient], cb);
			}
		},
		[clients, setClients],
	);

	useEffect(() => {
		const startCapture = async () => {
			localMediaStream.current = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
		};

		startCapture().then(() => {
			addNewClients(user, () => {
				const localElement = audioElements.current[user.id];
				if (localElement) {
					localElement.volume = 0;
					localElement.srcObject = localMediaStream.current;
				}

				// socket
				socketRef.current?.emit(SOCKET_ACTIONS.JOIN, {
					roomId,
					user,
				});
			});
		});

		// return () => {
		// 	// leaving the room
		// 	localMediaStream.current?.getTracks().forEach((track) => track.stop());

		// 	socketRef.current?.emit(SOCKET_ACTIONS.LEAVE);
		// };
	}, [addNewClients, roomId, user]);

	useEffect(() => {
		const handleNewPeer = async ({
			peerId,
			createOffer,
			remoteUser,
		}: {
			peerId: string;
			createOffer: boolean;
			remoteUser: IUser;
		}) => {
			// if already connected then give warning
			if (peerId in connections.current) {
				return console.warn(
					`You are already connected with ${peerId} - ${user.name}`,
				);
			}

			let peer = connections.current[peerId];

			peer = new RTCPeerConnection({
				iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
			});

			// handle new ice candidate
			peer.onicecandidate = (event) => {
				const ice = {
					peerId,
					icecandidate: event.candidate,
				};
				socketRef.current?.emit(SOCKET_ACTIONS.RELAY_ICE, ice);
			};

			// handle on track on this connection
			peer.ontrack = ({ streams: [remoteStream] }) => {
				addNewClients(remoteUser, () => {
					if (audioElements.current[remoteUser.id]) {
						audioElements.current[remoteStream.id]!.srcObject = remoteStream;
					} else {
						let settled = false;

						const interval = setInterval(() => {
							if (audioElements.current[remoteUser.id]) {
								audioElements.current[remoteStream.id]!.srcObject =
									remoteStream;
								settled = true;
							}

							if (settled) clearInterval(interval);
						}, 1000);
					}
				});
			};

			// add local track to remote connections
			localMediaStream.current?.getTracks().forEach((track) => {
				localMediaStream.current &&
					peer.addTrack(track, localMediaStream.current);
			});

			// create offer
			if (createOffer) {
				const offer = await peer.createOffer();

				await peer.setLocalDescription(offer);

				const sdp = {
					peerId,
					sdp: offer,
				};
				// send offer to another client
				socketRef.current?.emit(SOCKET_ACTIONS.RELAY_SDP, sdp);
			}
		};

		socketRef.current?.on(SOCKET_ACTIONS.ADD_PEER, handleNewPeer);

		return () => {
			socketRef.current?.off(SOCKET_ACTIONS.ADD_PEER);
		};
	}, [addNewClients, user?.name]);

	//  handle ice relay
	useEffect(() => {
		socketRef.current?.on(
			SOCKET_ACTIONS.ICE_CANDIDATE,
			({
				peerId,
				icecandidate,
			}: {
				peerId: string;
				icecandidate: RTCIceCandidate;
			}) => {
				connections.current[peerId].addIceCandidate(icecandidate);
			},
		);

		return () => {
			socketRef.current?.off(SOCKET_ACTIONS.ICE_CANDIDATE);
		};
	}, []);

	//  handle sdp relay
	useEffect(() => {
		const handleRemoteSdp = async ({
			peerId,
			sdp,
		}: {
			peerId: string;
			sdp: RTCSessionDescriptionInit;
		}) => {
			connections.current[peerId].setRemoteDescription(
				new RTCSessionDescription(sdp),
			);

			// if session description is type of offer then create the answer
			if (sdp.type === 'offer') {
				const connection = connections.current[peerId];
				const answer = await connection.createAnswer();

				connection.setLocalDescription(answer);

				socketRef.current?.emit(SOCKET_ACTIONS.RELAY_SDP, {
					peerId,
					sdp,
				});
			}
		};

		socketRef.current?.on(SOCKET_ACTIONS.SESSION_DESCRIPTION, handleRemoteSdp);

		return () => {
			socketRef.current?.off(SOCKET_ACTIONS.SESSION_DESCRIPTION);
		};
	}, []);

	// handle remove peer
	useEffect(() => {
		const handleRemovePeer = async ({
			peerId,
			userId,
		}: {
			peerId: string;
			userId: string;
		}) => {
			if (connections.current[peerId]) {
				connections.current[peerId].close();
			}

			delete connections.current[peerId];
			delete audioElements.current[peerId];
			setClients((prev) => prev.filter((client) => client.id !== userId));
		};

		socketRef?.current?.on(SOCKET_ACTIONS.REMOVE_PEER, handleRemovePeer);

		return () => {
			socketRef?.current?.off(SOCKET_ACTIONS.REMOVE_PEER);
		};
	}, [setClients]);

	const provideRef = (instance: HTMLAudioElement | null, userId: string) => {
		audioElements.current[userId] = instance;
	};

	return { clients, provideRef };
}
