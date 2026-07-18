const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// حل مشكلة Not Found عند التحديث
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// مخزن لحفظ رقم الغرفة الخاص بكل مستخدم
const socketRoomMap = {};

io.on("connection", (socket) => {

    socket.on("join-room", room => {
        socket.join(room);
        socketRoomMap[socket.id] = room;

        const clients = io.sockets.adapter.rooms.get(room);
        const count = clients ? clients.size : 0;

        if (count === 1) {
            socket.emit("created");
        } else {
            socket.emit("joined");
            socket.to(room).emit("ready");
        }
    });

    // أحداث الاتصال المرئي
    socket.on("offer", offer => {
        const room = socketRoomMap[socket.id];
        if (room) socket.to(room).emit("offer", offer);
    });

    socket.on("answer", answer => {
        const room = socketRoomMap[socket.id];
        if (room) socket.to(room).emit("answer", answer);
    });

    socket.on("candidate", candidate => {
        const room = socketRoomMap[socket.id];
        if (room) socket.to(room).emit("candidate", candidate);
    });

    // أحداث الدردشة النصية الجديدة
    socket.on("send-message", ({ room, message }) => {
        socket.to(room).emit("receive-message", message);
    });

    // حدث إنهاء المكالمة الجديد
    socket.on("hangup", (room) => {
        socket.to(room).emit("hangup");
    });

    // تنظيف البيانات عند خروج المستخدم
    socket.on("disconnect", () => {
        delete socketRoomMap[socket.id];
    });

});

server.listen(3000, "0.0.0.0", () => {
    console.log("Server running");
});