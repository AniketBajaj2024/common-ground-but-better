"use strict";
// import { User } from "./UserManager";
// let globalId = 1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
let globalId = 1;
class RoomManager {
    constructor() {
        this.rooms = new Map();
    }
    createRoom(user1, user2) {
        const roomId = this.generateRoomId().toString();
        this.rooms.set(roomId, {
            user1,
            user2
        });
        console.log(`Room created with ID: ${roomId}, User1: ${user1.name}, User2: ${user2.name}`);
        user1.socket.emit("send-offer", {
            roomId
        });
    }
    onOffer(roomId, sdp) {
        console.log("Processing offer...");
        const room = this.rooms.get(roomId);
        if (!room) {
            console.error(`Room not found for roomId: ${roomId}`);
            return;
        }
        const user2 = room.user2;
        console.log("User 2 is " + (user2 ? user2.name : 'undefined'));
        user2 === null || user2 === void 0 ? void 0 : user2.socket.emit("offer", {
            sdp,
            roomId
        });
    }
    onAnswer(roomId, sdp) {
        console.log("Processing answer...");
        const room = this.rooms.get(roomId);
        if (!room) {
            console.error(`Room not found for roomId: ${roomId}`);
            return;
        }
        const user1 = room.user1;
        console.log("User 1 is " + (user1 ? user1.name : 'undefined'));
        user1 === null || user1 === void 0 ? void 0 : user1.socket.emit("answer", {
            sdp,
            roomId
        });
    }
    generateRoomId() {
        return globalId++;
    }
}
exports.RoomManager = RoomManager;
