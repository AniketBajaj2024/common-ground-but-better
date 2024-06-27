import { Socket } from "socket.io";
import { RoomManager } from "./RoomManager";

export interface User{
    socket : Socket,
    name: String
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

    addUser(name : String , socket : Socket){
        this.users.push({
            name,
            socket
        });
        this.queue.push(socket.id);
        this.clearQueue();
        this.intiHandlers(socket);
    }

    removeUser(socketId : string){
        this.users = this.users.filter(x=>x.socket.id === socketId);
        this.queue = this.queue.filter(x=> x === socketId);
    }


    clearQueue(){
        if(this.queue.length<2){
            return;
        }

        // This statement is findig the user from users array who id == id of last elememnt of queue
        const user1 = this.users.find(x=>x.socket.id === this.queue.pop());
        const user2 = this.users.find(x=>x.socket.id === this.queue.pop());
        if(!user1 || user2){
            return;
        }
        const room = this.roomManager.createRoom(user1 , user1);

    }

    intiHandlers(socket : Socket){
        socket.on("offer" , ({sdp,roomId} : {sdp:string , roomId : string})=>{
            this.roomManager.onOffer(roomId,sdp)
        })
        socket.on("answer" , ({sdp,roomId} : {sdp:string , roomId : string})=>{
            this.roomManager.onOffer(roomId,sdp)
        })
    }


    
}