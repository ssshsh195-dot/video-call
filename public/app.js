const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

const roomInput = document.getElementById("roomInput");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");

let room = "";
let localStream;
let peerConnection;

const configuration = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};

async function startCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        localVideo.srcObject = localStream;
    } catch (err) {
        console.error(err);
        alert(err.name + "\n\n" + err.message);
    }
}

startCamera();

createBtn.onclick = () => {
    room = roomInput.value.trim();
    if (!room) {
        alert("اكتب رقم الغرفة");
        return;
    }
    socket.emit("join-room", room);
};

joinBtn.onclick = () => {
    room = roomInput.value.trim();
    if (!room) {
        alert("اكتب رقم الغرفة");
        return;
    }
    socket.emit("join-room", room);
};

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("candidate", event.candidate);
        }
    };
}

socket.on("created", () => {
    console.log("تم إنشاء الغرفة، بانتظار الطرف الآخر...");
});

socket.on("joined", () => {
    console.log("تم الانضمام للغرفة بنجاح");
});

socket.on("ready", async () => {
    createPeerConnection();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);
});

socket.on("offer", async (offer) => {
    if (!peerConnection) createPeerConnection();
    await peerConnection.setRemoteDescription(offer);
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer);
});

socket.on("answer", async (answer) => {
    await peerConnection.setRemoteDescription(answer);
});

socket.on("candidate", async (candidate) => {
    if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
    }
});