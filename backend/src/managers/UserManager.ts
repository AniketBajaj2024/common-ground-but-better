import { Socket } from "socket.io";
import { RoomManager } from "./RoomManager";

export interface User{
    socket : Socket,
    name: String,
    interests: string[];
};
export class UserManager{
    private users : User[];
    private queue: string[];
    private roomManager : RoomManager;
    constructor(){
        this.users = [];
        this.queue = [];
        this.roomManager = new RoomManager();
    }

    addUser(name : String , interests: string[], socket : Socket){
            this.users.push({
            name,
            interests,
            socket
        });
        if (!this.queue.includes(socket.id)) {
            this.queue.push(socket.id);
        }
        socket.send("lobby");
        this.clearQueue();
        this.initHandlers(socket);
    }

    removeUser(socketId : string){
        this.users = this.users.filter(x=>x.socket.id !== socketId);
        this.queue = this.queue.filter(x=> x !== socketId);
    
    }


    clearQueue(){
        const connectedSocketIds = new Set(this.users.map((user) => user.socket.id));

        // Remove stale IDs and duplicates while preserving queue order.
        const dedupedQueue: string[] = [];
        const seen = new Set<string>();
        for (const socketId of this.queue) {
            if (!connectedSocketIds.has(socketId) || seen.has(socketId)) {
                continue;
            }
            seen.add(socketId);
            dedupedQueue.push(socketId);
        }
        this.queue = dedupedQueue;

        while (this.queue.length >= 2) {
            const id1 = this.queue.shift();
            const id2 = this.queue.shift();

            if (!id1 || !id2) {
                return;
            }

            const user1 = this.users.find(x => x.socket.id === id1);
            const user2 = this.users.find(x => x.socket.id === id2);

            if (!user1 || !user2) {
                continue;
            }

            this.roomManager.createRoom(user1, user2);
        }

    }

    initHandlers(socket : Socket){
        socket.on("offer" , ({sdp,roomId} : {sdp:string , roomId : string})=>{
            console.log("offer recieved");
            this.roomManager.onOffer(roomId,sdp, socket.id);
        })

        socket.on("answer" , ({sdp,roomId} : {sdp:string , roomId : string})=>{
            console.log("answer recieved");

            this.roomManager.onAnswer(roomId,sdp, socket.id);
        })
        
        socket.on("add-ice-candidate" , ({candidate , roomId , type})=>{
            this.roomManager.onIceCandidates(roomId,socket.id ,candidate, type);
        })
    }
}