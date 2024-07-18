// Harkirat code's (room not getting created)

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




// chatgpt code
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Socket, io } from "socket.io-client";

const URL = "http://localhost:4000";

// Here we have two peer connections one is recieving the video or whatever and other is sending the video thats why we put recievingPc and sendingPc
// on google meet there is only single server but on websites like omegle there is always two connections

export const Room = ({
    name,
    localAudioTrack,
    localVideoTrack
} :{
    name : string,
    localAudioTrack : MediaStreamTrack | null,
    localVideoTrack : MediaStreamTrack | null
}) => {
    const [searchParams] = useSearchParams();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [lobby, setLobby] = useState(true);
    const [sendingPc,setSendningPc] = useState<null | RTCPeerConnection>(null);
    const [receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(null);
    const [remoteVideoTrack, setRemoteVideoTrack] = useState<MediaStreamTrack | null>(null);
    const [remoteAudioTrack, setRemoteAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>();
    const localVideoRef =useRef<HTMLVideoElement>();


    


    useEffect(() => {
        const socket = io(URL);

        const handleSendOffer = async (data: { roomId: string }) => {
            // alert("Send offer");
            console.log("sending offer");
            setLobby(false);
            const pc = new RTCPeerConnection();
            setSendningPc(pc);
            if(localVideoTrack){
                pc.addTrack(localVideoTrack);
            }

            if(localAudioTrack){
                pc.addTrack(localAudioTrack);
            }

            pc.onicecandidate = async(e)=>{
                console.log("recieving ice candidate locally");
                if(e.candidate){
                    socket.emit("add-ice-candidate", {
                        candidate : e.candidate,
                        type: "sender"
                    })
                }
            }

            
            // In WEBRTC one peer to peer connection so if 3rd user comes in then it will send request to remaining two but RTC can only make on p2p connection: https://stackoverflow.com/questions/66062565/failed-to-set-remote-answer-sdp-called-in-wrong-state-stable
            pc.onnegotiationneeded = async ()=>{
                // alert("on negotiation needed");
                console.log("on negotiation needed , sending offer");
                    const sdp = await pc.createOffer();
                    //@ts-ignore
                    pc.setLocalDescription(sdp);
                    socket.emit("offer", {
                    sdp,  // Include the actual SDP here
                    roomId: data.roomId
                });
                
            }
        };

        // here offer is nothing but the sdp we are getting from the another user
        const handleOffer = async ({ roomId, sdp :remoteSdp }: { roomId: string; sdp : RTCSessionDescriptionInit}) => {
            // alert("Send Answer");
            console.log("reveived offer");
            console.log("sending offer")
            setLobby(false);

            const pc = new RTCPeerConnection();
            // remote description will tell that the other person have this sdp so 
            pc.setRemoteDescription(remoteSdp);
            const sdp = await pc.createAnswer();

            //@ts-ignore
            pc.setLocalDescription(sdp);

            const stream = new MediaStream()
            if(remoteVideoRef.current){
                remoteVideoRef.current.srcObject = stream;
            }
            setRemoteMediaStream(stream);
            setReceivingPc(pc);

            pc.onicecandidate = async(e)=>{
                console.log("on ice candidate on reveiving offer");
                console.log("recieving ice candidate locally");
                if(e.candidate){
                    socket.emit("add-ice-candidate", {
                        candidate : e.candidate,
                        type : "receiver"
                    })
                }
            }

            pc.ontrack = (({track , type})=>{
                if(type == 'audio'){
                    // setRemoteAudioTrack(track);
                    //@ts-ignore
                    remoteVideoRef.current?.srcObject.addTrack(track);
                }else{
                    // setRemoteVideoTrack(track);
                    //@ts-ignore
                    remoteVideoRef.current?.srcObject.addTrack(track);

                }
                //@ts-ignore
                remoteVideoRef.current?.play();

            });
            //  iske niche wala part comment out krna hai
            socket.emit("answer", {
                roomId,
                sdp : sdp
            });
        };

        const handleAnswer = async ({ roomId, sdp : remoteSdp }: { roomId: string; sdp : RTCSessionDescriptionInit })  => {
            // alert("Connection done");
            setLobby(false);

            setSendningPc(pc => {
                pc?.setRemoteDescription(remoteSdp)
                    .then(()=>{
                        console.log("Remote description set successfully.")
                    }).catch(e=>{
                        console.error("Error setting remote description:", e);
                    });
                return pc;
            })
            console.log("loop closed");
        };

        const handleLobby = () => {
            setLobby(true);
        };

        socket.on('send-offer', handleSendOffer);
        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('lobby', handleLobby);
        socket.on("add-ice-candidate",({candidate, type})=>{
            console.log("Add ice candidate from remote");
            console.log({candidate, type});
            if(type == "sender"){
                setReceivingPc(pc => {
                    pc?.addIceCandidate(candidate)
                    return pc;
                })
            }else{
                setReceivingPc(pc => {
                    pc?.addIceCandidate(candidate)
                    return pc;
                })
            }
        } )

        setSocket(socket);

        return () => {
            socket.off('send-offer', handleSendOffer);
            socket.off('offer', handleOffer);
            socket.off('answer', handleAnswer);
            socket.off('lobby', handleLobby);
            socket.close();
        };
    }, [name]);


    useEffect(()=>{
        if(localVideoRef.current){
            if(localVideoTrack){
                localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
                localVideoRef.current.play();
            }

        }
    }, [localVideoRef]);


    return <div>
        Hi {name}
        <video autoPlay width={400} height={400} ref= {localVideoRef}/>
        {lobby ? "Waiting to connect you to someone" : null}
        <video autoPlay width={400} height={400} ref= {remoteVideoRef}/>
    </div>
}
