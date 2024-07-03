// import { useEffect, useState } from "react";
// import { useSearchParams } from "react-router-dom";
// import { Socket, io } from "socket.io-client";



// const URL = "http://localhost:4000";
// export const Room = ()=>{
//     const [searchParams , setSearchParams] = useSearchParams();
//     const name = searchParams.get('name');
//     const [socket , setSocket] = useState<null | Socket>(null);
//     const [lobby , setLobby] = useState(true);

//     useEffect(()=>{
//         const socket = io(URL);
//         socket.on('send-offer', (roomId)=>{
//             alert("Send offer");
//             setLobby(false);
//             socket.emit("offer",{
//                 sdp : "",
//                 roomId
//             });
//         });

//         socket.on('offer', (roomId , offer)=>{
//             alert("Send Answer");
//             setLobby(false);
//             socket.emit("answer",{
//                 sdp : "",
//                 roomId
//             });
//         });

//         socket.on('answer', (roomId , answer)=>{
//             alert("Connection done");
//         });


//         socket.on("lobby", ()=>{
//             setLobby(true);
//         });

//         setSocket(socket);
//         // logic to init
//     },[name]);

//     if(lobby){
//         return <div>
//             Waiting to connect to you someone
//         </div>
//     }
//     return <div>
//         Hi {name}
//         <video width={400} height={400}/>
//         <video width={400} height={400}/>

//     </div>
// }


import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Socket, io } from "socket.io-client";

const URL = "http://localhost:4000";

export const Room = () => {
    const [searchParams] = useSearchParams();
    const name = searchParams.get('name');
    const [socket, setSocket] = useState<Socket | null>(null);
    const [lobby, setLobby] = useState(true);

    useEffect(() => {
        const socket = io(URL);

        const handleSendOffer = (data: { roomId: string }) => {
            alert("Send offer");
            setLobby(false);
            socket.emit("offer", {
                sdp: "",  // Include the actual SDP here
                roomId: data.roomId
            });
        };

        const handleOffer = (data: { roomId: string, sdp: string }) => {
            alert("Send Answer");
            setLobby(false);
            //  iske niche wala part comment out krna hai
            socket.emit("answer", {
                sdp: "",  // Include the actual SDP here
                roomId: data.roomId
            });
        };

        const handleAnswer = (data: { roomId: string, sdp: string }) => {
            alert("Connection done");
        };

        const handleLobby = () => {
            setLobby(true);
        };

        socket.on('send-offer', handleSendOffer);
        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('lobby', handleLobby);

        setSocket(socket);

        return () => {
            socket.off('send-offer', handleSendOffer);
            socket.off('offer', handleOffer);
            socket.off('answer', handleAnswer);
            socket.off('lobby', handleLobby);
            socket.close();
        };
    }, [name]);

    if (lobby) {
        return <div>
            Waiting to connect to someone
        </div>
    }

    return <div>
        Hi {name}
        <video width={400} height={400} />
        <video width={400} height={400} />
    </div>
}
