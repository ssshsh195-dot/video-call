const socket = io();

// عناصر الفيديو والغرفة
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const roomInput = document.getElementById("roomInput");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const hangupBtn = document.getElementById("hangupBtn"); 

// عناصر الدردشة
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messagesDiv = document.getElementById("messages");

let room = "";
let localStream;
let peerConnection;

// إعدادات الاتصال (TURN/STUN)
const configuration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
    ]
};

async function startCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (err) {
        console.error(err);
        alert("يرجى السماح بالوصول للكاميرا والميكروفون.");
    }
}

startCamera();

// --- منطق الغرف ---
createBtn.onclick = () => {
    if (!localStream) { alert("يرجى الانتظار حتى تظهر صورتك."); return; }
    room = roomInput.value.trim();
    if (!room) { alert("اكتب رقم الغرفة"); return; }
    socket.emit("join-room", room);
};

joinBtn.onclick = () => {
    if (!localStream) { alert("يرجى الانتظار حتى تظهر صورتك."); return; }
    room = roomInput.value.trim();
    if (!room) { alert("اكتب رقم الغرفة"); return; }
    socket.emit("join-room", room);
};

// --- منطق إنهاء المكالمة ---
function endCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localVideo.srcObject = null;
    }
    remoteVideo.srcObject = null;
    if (room) {
        socket.emit("hangup", room);
    }
    console.log("تم إنهاء المكالمة");
    alert("تم إنهاء المكالمة بنجاح");
}

hangupBtn.onclick = endCall;

socket.on("hangup", () => {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    remoteVideo.srcObject = null;
    alert("قام الطرف الآخر بإنهاء المكالمة");
});

// --- منطق الدردشة النصية ---
sendBtn.onclick = () => {
    const message = messageInput.value.trim();
    
    // إضافة تنبيه في حال لم يدخل المستخدم غرفة بعد
    if (!room) {
        alert("يجب إنشاء غرفة أو الانضمام إليها أولاً قبل إرسال الرسائل!");
        return;
    }

    if (message) {
        const msgElement = document.createElement("div");
        msgElement.innerText = "أنت: " + message;
        msgElement.className = "message my-message"; // إضافة كلاس للتنسيق
        messagesDiv.appendChild(msgElement);
        
        socket.emit("send-message", { room, message });
        messageInput.value = "";
        
        // التمرير التلقائي لأسفل المحادثة
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
};

socket.on("receive-message", (message) => {
    const msgElement = document.createElement("div");
    msgElement.innerText = "صديقي: " + message;
    msgElement.className = "message peer-message"; // إضافة كلاس للتنسيق
    messagesDiv.appendChild(msgElement);
    
    // التمرير التلقائي لأسفل المحادثة
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
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
}

socket.on("created", () => console.log("تم إنشاء الغرفة"));
socket.on("joined", () => console.log("تم الانضمام للغرفة"));

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