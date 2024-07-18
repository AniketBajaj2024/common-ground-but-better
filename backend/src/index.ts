import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { UserManager } from './managers/UserManager';

console.log("Starting server...");

const app = express();
const server = http.createServer(http);
const io = new Server(server, {
    cors: {
        origin : "*"
    }
});

const userManager = new UserManager();

io.on('connection', (socket: Socket) => {
    console.log("A user connected");
    userManager.addUser("random User", socket);
    socket.on("disonnect", ()=>{
        console.log("user disconnected");
        userManager.removeUser(socket.id);
    })
});

server.listen(4000, () => {
    console.log('Server is listening on port 3000');
});
