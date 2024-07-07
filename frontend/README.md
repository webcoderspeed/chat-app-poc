
### WebRTC Example

This example demonstrates a simple WebRTC setup for establishing a peer-to-peer data channel between two clients, allowing them to send and receive messages. Below are the scripts for `CLIENT ONE` and `CLIENT TWO`.

#### CLIENT ONE

```js
const peerConnection = new RTCPeerConnection();

// Create a data channel
const dataChannel = peerConnection.createDataChannel('data-channel');

dataChannel.onopen = () => console.log('Channel opened');
dataChannel.onmessage = (e) => console.log('Just got a message: ' + e.data);

peerConnection.onicecandidate = (e) => {
    console.log('ICE candidate:', JSON.stringify(peerConnection.localDescription));
};

// Create an offer and set it as the local description
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);

// Copy the offer and send it to `CLIENT TWO`, then set the received answer as the remote description
await peerConnection.setRemoteDescription(answer);

// Sending a message through the data channel
dataChannel.send('Hello from browser 1');
```

#### CLIENT TWO

```js
const peerConnection = new RTCPeerConnection();

// Set up data channel event listeners
let dataChannel;

peerConnection.ondatachannel = (e) => {
    dataChannel = e.channel;
    dataChannel.onopen = () => console.log('Channel opened');
    dataChannel.onmessage = (e) => console.log('Message received: ' + e.data);
};

peerConnection.onicecandidate = (e) => {
    console.log('ICE candidate:', JSON.stringify(peerConnection.localDescription));
};

// Set the remote description using the offer received from `CLIENT ONE`
await peerConnection.setRemoteDescription(offer);

// Create an answer and set it as the local description
const answer = await peerConnection.createAnswer();
await peerConnection.setLocalDescription(answer);

// Sending a message through the data channel
dataChannel.send('Hello from browser 2');
```

### Steps to Establish the Connection

1. **Client One**:
   - Create a `RTCPeerConnection` instance.
   - Create a data channel and set up event listeners.
   - Create an offer and set it as the local description.
   - Share the offer with `CLIENT TWO`.

2. **Client Two**:
   - Create a `RTCPeerConnection` instance.
   - Set up a listener for the data channel.
   - Receive the offer from `CLIENT ONE` and set it as the remote description.
   - Create an answer and set it as the local description.
   - Share the answer with `CLIENT ONE`.

3. **Client One**:
   - Receive the answer from `CLIENT TWO` and set it as the remote description.

4. **Communication**:
   - Both clients can now send messages through the established data channel.


