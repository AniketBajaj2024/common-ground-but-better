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
        socket.send("lobby");
        this.clearQueue();
        this.initHandlers(socket);
    }

    removeUser(socketId : string){
        const user = this.users.find(x=>x.socket.id === socketId);
        this.users = this.users.filter(x=>x.socket.id !== socketId);
        this.queue = this.queue.filter(x=> x === socketId);
    
    }


    clearQueue(){
        console.log("inside clear queue");
        console.log(this.queue.length);
        if(this.queue.length<2){
            return;
        }
        console.log(this.users);
        console.log(this.queue);
        const id1 = this.queue.pop();
        const id2 = this.queue.pop();
        console.log("id is "+ id1 + " " + id2);


        // This statement is findig the user from users array who id == id of last elememnt of queue
        const user1 = this.users.find(x=>x.socket.id === id1);
        const user2 = this.users.find(x=>x.socket.id === id2);

        console.log(user1);
        console.log(user2);
        if(!user1 || !user2){
            return;
        }
        console.log("creating room");
        const room = this.roomManager.createRoom(user1 , user2);
        this.clearQueue();

    }

    initHandlers(socket : Socket){
        socket.on("offer" , ({sdp,roomId} : {sdp:string , roomId : string})=>{
            console.log("offer recieved");
            this.roomManager.onOffer(roomId,sdp);
        })
        socket.on("answer" , ({sdp,roomId} : {sdp:string , roomId : string})=>{
            console.log("answer recieved");

            this.roomManager.onAnswer(roomId,sdp);
        })  
    }
}