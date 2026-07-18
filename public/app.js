const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const roomInput = document.getElementById("roomInput");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const hangupBtn = document.getElementById("hangupBtn"); 
// عنصر القائمة الجديد
const participantsList = document.getElementById("participantsList");

const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messagesDiv = document.getElementById("messages");

let room = "";
let localStream;
let peerConnection;

const configuration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" }
    ]
};

async function startCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (err) {
        console.error("خطأ الوصول للكاميرا:", err);
        alert("يرجى السماح بالوصول للكاميرا والميكروفون.");
    }
}

startCamera();

// --- منطق المتصلين ---
socket.on("update-user-list", (users) => {
    participantsList.innerHTML = ""; // مسح القائمة الحالية لإعادة بنائها
    users.forEach(id => {
        const li = document.createElement("li");
        // تمييز المستخدم الحالي في القائمة
        li.innerText = (id === socket.id) ? "أنا (You)" : "عضو: " + id.substring(0, 5) + "...";
        participantsList.appendChild(li);
    });
});

// --- منطق الغرف ---
function joinRoom() {
    room = roomInput.value.trim();
    if (!room) { alert("اكتب رقم الغرفة"); return; }
    if (!localStream) { alert("يرجى الانتظار حتى تظهر صورتك."); return; }
    socket.emit("join-room", room);
}

createBtn.onclick = joinRoom;
joinBtn.onclick = joinRoom;

// --- منطق إنهاء المكالمة ---
function endCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    remoteVideo.srcObject = null;
    if (room) socket.emit("hangup", room);
}

hangupBtn.onclick = endCall;

socket.on("hangup", () => {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    remoteVideo.srcObject = null;
    alert("انتهت المكالمة");
});

// --- منطق الاتصال المرئي ---
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

    peerConnection.oniceconnectionstatechange = () => {
        console.log("حالة الاتصال ICE:", peerConnection.iceConnectionState);
    };
}

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
    try {
        if (peerConnection) {
            if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
                console.log("بانتظار اكتمال الاتصال لإضافة Candidate...");
            }
        }
    } catch (e) {
        console.error("خطأ في إضافة ICE candidate:", e);
    }
});