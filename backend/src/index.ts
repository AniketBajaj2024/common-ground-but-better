import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';

console.log("Starting server...");

const app = express();
const server = http.createServer(http);
const io = new Server(server);

io.on('connection', (socket: Socket) => {
    console.log("A user connected");
});

server.listen(3000, () => {
    console.log('Server is listening on port 3000');
});
