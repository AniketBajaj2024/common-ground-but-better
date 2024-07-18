// import { User } from "./UserManager";
// let globalId = 1;


// export interface Room{
//     user1 : User,
//     user2 : User,
// }
// export class RoomManager{
    
//     private rooms : Map<string , Room>
//     constructor(){
//         this.rooms = new Map<string , Room>();
//     }
//     createRoom(user1 : User , user2 : User){
//         const roomId = this.generate().toString();
//         this.rooms.set(roomId , {
//             user1,
//             user2
//         });
//         console.log(`Room created with ID: ${roomId}, User1: ${user1.name}, User2: ${user2.name}`);

//         user1.socket.emit("send-offer",{
//             roomId
//         });
//     }

//     onOffer(roomId:string , sdp : string){
//         console.log("This offer not found")
//         const room = this.rooms.get(roomId);
//         if(!room){
//             console.error(`Room not found for roomId: ${roomId}`);
//             return;
//         }
//         const user2 = room.user2;
//         console.log("User 2 is " + (user2 ? user2.name : 'undefined'));
//         console.log("user 2 is " + user2);
//         user2?.socket.emit("offer", {
//             sdp,
//             roomId
//         });
//     }

//     onAnswer(roomId : string , sdp :string){
//         console.log("This answer not found")
//         const room = this.rooms.get(roomId);
//         if(!room){
//             console.error(`Room not found for roomId: ${roomId}`);
//             return;
//         }
//         const user1 = room.user1;
//         console.log("User 1 is " + (user1 ? user1.name : 'undefined'));
//         console.log("user 1 is" + user1);
//         user1?.socket.emit("answer", {
//         sdp,
//         roomId
//     })

//     }

//     generate(){
//         return globalId++;
//     }
// }
import { User } from "./UserManager";
let globalId = 1;

export interface Room {
    user1: User,
    user2: User,
}

export class RoomManager {

    private rooms: Map<string, Room>;

    constructor() {
        this.rooms = new Map<string, Room>();
    }

    createRoom(user1: User, user2: User) {
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

    onOffer(roomId: string, sdp: string, senderSocketId: string) {
        const room = this.rooms.get(roomId);
        if (!room) {
            console.error(`Room not found for roomId: ${roomId}`);
            return;
        }
        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;        
        receivingUser?.socket.emit("offer", {
            sdp,
            roomId
        });
    }

    onAnswer(roomId: string, sdp: string, senderSocketId:string) {
        const room = this.rooms.get(roomId);
        if (!room) {
            console.error(`Room not found for roomId: ${roomId}`);
            return;
        }
        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;        
        
        receivingUser?.socket.emit("answer", {
            sdp,
            roomId
        });
    }

    onIceCandidates(roomId : string , senderSocketId : string , candidate : any, type : "sender" | "receiver"){
        const room = this.rooms.get(roomId);
        if(!room){
            console.log("room not found in incecandiates");
            return;
        }
        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
        receivingUser.socket.send("add-ice-candidate", ({candidate, type}));
    }

    generateRoomId() {
        return globalId++;
    }
}

