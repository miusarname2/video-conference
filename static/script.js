const videoGrid = document.getElementById('video-grid');
const peers = {};

const myVideo = document.createElement('video');
myVideo.muted = true;
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    addVideoStream(myVideo, stream);

    // Use WSS for secure WebSocket connection
    const ws = new WebSocket('wss://' + window.location.host + '/ws');
    ws.onmessage = ({ data }) => {
        const message = JSON.parse(data);

        switch (message.type) {
            case 'offer':
                handleOffer(message.content, ws, stream);
                break;
            case 'answer':
                handleAnswer(message.content);
                break;
            case 'ice-candidate':
                handleIceCandidate(message.content);
                break;
        }
    };

    ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join', content: 'A user joined' }));
    };
});

function handleOffer(offer, ws, stream) {
    const peerConnection = new RTCPeerConnection();
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
    });

    peerConnection.createAnswer().then(answer => {
        peerConnection.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'answer', content: answer }));
    });

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            ws.send(JSON.stringify({ type: 'ice-candidate', content: event.candidate }));
        }
    };

    peerConnection.ontrack = event => {
        const video = document.createElement('video');
        video.srcObject = event.streams[0];
        video.addEventListener('loadedmetadata', () => {
            video.play();
        });
        videoGrid.append(video);
    };

    peers[ws] = peerConnection;
}

function handleAnswer(answer) {
    const peerConnection = peers[ws];
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

function handleIceCandidate(candidate) {
    const peerConnection = peers[ws];
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video);
}
