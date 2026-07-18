const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {

    socket.on("join-room", room => {

        socket.join(room);

        const clients =
            io.sockets.adapter.rooms.get(room);

        const count = clients ? clients.size : 0;

        if (count === 1) {

            socket.emit("created");

        } else {

            socket.emit("joined");

            socket.to(room).emit("ready");
        }

        socket.on("offer", offer => {
            socket.to(room).emit("offer", offer);
        });

        socket.on("answer", answer => {
            socket.to(room).emit("answer", answer);
        });

        socket.on("candidate", candidate => {
            socket.to(room).emit("candidate", candidate);
        });

    });

});

server.listen(3000, "0.0.0.0", () => {
    console.log("Server running");
});