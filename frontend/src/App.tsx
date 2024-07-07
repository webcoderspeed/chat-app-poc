import { useWebRTC } from './hooks';
import { generateUsername } from 'unique-username-generator';

const roomId = '1';

const user = {
	id: Math.random().toString(34),
	name: generateUsername(),
};

function App() {
	const { clients, provideRef } = useWebRTC(roomId, user);

	return (
		<div>
			<h1>All connected clients</h1>
			{clients.map((client, index) => (
				<div key={`${client.id}-${index + 1}`}>
					<audio
						ref={(instance) => provideRef(instance, client.id)}
						controls
						autoPlay
					/>
					<h4>{client.name}</h4>
				</div>
			))}
		</div>
	);
}

export default App;
