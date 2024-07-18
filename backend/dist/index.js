"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const UserManager_1 = require("./managers/UserManager");
console.log("Starting server...");
const app = (0, express_1.default)();
const server = http_1.default.createServer(http_1.default);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*"
    }
});
const userManager = new UserManager_1.UserManager();
io.on('connection', (socket) => {
    console.log("A user connected");
    userManager.addUser("random User", socket);
    socket.on("disonnect", () => {
        console.log("user disconnected");
        userManager.removeUser(socket.id);
    });
});
server.listen(4000, () => {
    console.log('Server is listening on port 3000');
});
