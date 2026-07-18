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

    alert(
        err.name + "\n\n" +
        err.message
    );

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

socket.on("created", () => {
    console.log("تم إنشاء الغرفة");
});

socket.on("joined", () => {
    console.log("تم الانضمام");
});

socket.on("ready", () => {
    console.log("الطرف الآخر جاهز");
});