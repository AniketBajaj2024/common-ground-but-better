import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// Here we have two peer connections one is recieving the video or whatever and other is sending the video thats why we put recievingPc and sendingPc
// on google meet there is only single server   but on websites like omegle there is always two connections



export const Room = ({
    name,
    interests,
    localAudioTrack,
    localVideoTrack,
    onLeave
} :{
    name : string,
    interests: string[];
    localAudioTrack : MediaStreamTrack | null,
    localVideoTrack : MediaStreamTrack | null,
    onLeave: () => void
}) => {
    const [lobby, setLobby] = useState(true);
    const [connectionState, setConnectionState] = useState<"connecting" | "waiting" | "connected" | "disconnected">("connecting");
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [sharedInterests, setSharedInterests] = useState<string[]>([]);

    const sendingPcRef = useRef<RTCPeerConnection | null>(null);
    const receivingPcRef = useRef<RTCPeerConnection | null>(null);
    const socketRef = useRef<ReturnType<typeof io> | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    const tracksRef = useRef({ video: localVideoTrack, audio: localAudioTrack });

    useEffect(() => {
        tracksRef.current = { video: localVideoTrack, audio: localAudioTrack };
    }, [localVideoTrack, localAudioTrack]);

    const pendingCandidates = useRef<{ sender: RTCIceCandidateInit[], receiver: RTCIceCandidateInit[] }>({
        sender: [],
        receiver: []
    });

    const closePeerConnections = () => {
        if (sendingPcRef.current) {
            sendingPcRef.current.ontrack = null;
            sendingPcRef.current.onicecandidate = null;
            sendingPcRef.current.close();
            sendingPcRef.current = null;
        }

        if (receivingPcRef.current) {
            receivingPcRef.current.ontrack = null;
            receivingPcRef.current.onicecandidate = null;
            receivingPcRef.current.close();
            receivingPcRef.current = null;
        }

        pendingCandidates.current = {
            sender: [],
            receiver: []
        };

        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
    };

    const rtcConfiguration: RTCConfiguration = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
        ]
    };


    useEffect(() => {
        if (localAudioTrack) {
            localAudioTrack.enabled = isAudioEnabled;
        }
    }, [localAudioTrack, isAudioEnabled]);

    useEffect(() => {
        if (localVideoTrack) {
            localVideoTrack.enabled = isVideoEnabled;
        }
    }, [localVideoTrack, isVideoEnabled]);

    useEffect(() => {
        const socket = io(URL);
        socketRef.current = socket;
        setConnectionState("connecting");

        const attachPeerConnectionLogs = (pc: RTCPeerConnection, label: string) => {
            pc.oniceconnectionstatechange = () => console.log(`${label} iceConnectionState:`, pc.iceConnectionState);
            pc.onsignalingstatechange = () => console.log(`${label} signalingState:`, pc.signalingState);
            pc.onconnectionstatechange = () => {
                console.log(`${label} connectionState:`, pc.connectionState);
                if (pc.connectionState === "connected") {
                    setConnectionState("connected");
                }

                if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
                    closePeerConnections();
                    setConnectionState("waiting");
                    setLobby(true);
                    setAiSuggestions([]);
                    setSharedInterests([]);
                }
            };
        };

        const addRemoteTrackToVideo = (track: MediaStreamTrack) => {
            if (!remoteVideoRef.current) return;

            if (!remoteVideoRef.current.srcObject) {
                remoteVideoRef.current.srcObject = new MediaStream();
            }

            const stream = remoteVideoRef.current.srcObject as MediaStream;
            stream.addTrack(track);

            track.onended = () => {
                if (!remoteVideoRef.current?.srcObject) {
                    return;
                }

                const activeStream = remoteVideoRef.current.srcObject as MediaStream;
                activeStream.removeTrack(track);

                if (activeStream.getTracks().length === 0) {
                    remoteVideoRef.current.srcObject = null;
                    setConnectionState("waiting");
                    setLobby(true);
                }
            };

            if (track.kind === "video") {
                remoteVideoRef.current.play().catch(() => {});
            }
        };

        const handleSendOffer = async (data: { roomId: string }) => {
            console.log("sending offer");
            setLobby(false);
            setConnectionState("connecting");
            closePeerConnections();

            const pc = new RTCPeerConnection(rtcConfiguration);
            sendingPcRef.current = pc;

            attachPeerConnectionLogs(pc, "SENDER_PC");

            const remoteStream = new MediaStream();
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }

            if (tracksRef.current.video) pc.addTrack(tracksRef.current.video);
            if (tracksRef.current.audio) pc.addTrack(tracksRef.current.audio);
            

            pc.onicecandidate = async (e) => {
                console.log("recieving ice candidate locally");
                if (e.candidate) {
                    socket.emit("add-ice-candidate", {
                        candidate : e.candidate,
                        type: "sender",
                        roomId: data.roomId
                    });
                }
            };

            pc.ontrack = ({ track }) => {
                addRemoteTrackToVideo(track);
            };

            
            // In WEBRTC one peer to peer connection so if 3rd user comes in then it will send request to remaining two but RTC can only make on p2p connection: https://stackoverflow.com/questions/66062565/failed-to-set-remote-answer-sdp-called-in-wrong-state-stable
            pc.onnegotiationneeded = async ()=>{
                console.log("on negotiation needed , sending offer");
                    const sdp = await pc.createOffer();
                    await pc.setLocalDescription(sdp);
                    socket.emit("offer", {
                    sdp,
                    roomId: data.roomId
                });
                
            };
        };

        const handleOffer = async ({ roomId, sdp :remoteSdp }: { roomId: string; sdp : RTCSessionDescriptionInit}) => {
            console.log("reveived offer");
            console.log("sending offer")
            setLobby(false);
            setConnectionState("connecting");

            closePeerConnections();

            const pc = new RTCPeerConnection(rtcConfiguration);
            
            receivingPcRef.current = pc;
            attachPeerConnectionLogs(pc, "RECEIVER_PC");

            if (tracksRef.current.video) pc.addTrack(tracksRef.current.video);
            if (tracksRef.current.audio) pc.addTrack(tracksRef.current.audio);
            pc.ontrack = ({ track }) => {
                console.log("Track received on Receiver side!");
                addRemoteTrackToVideo(track);
        };

            pc.onicecandidate = async(e)=>{
                console.log("on ice candidate on reveiving offer");
                console.log("recieving ice candidate locally");
                if(e.candidate){
                    socket.emit("add-ice-candidate", {
                        candidate : e.candidate.toJSON(),
                        type : "receiver",
                        roomId: roomId
                    })
                }
            };
            
            await pc.setRemoteDescription(remoteSdp);


            pendingCandidates.current.sender.forEach(candidate => {
                pc.addIceCandidate(candidate).catch(console.error);
            });
            pendingCandidates.current.sender = [];

            const sdp = await pc.createAnswer();
            await pc.setLocalDescription(sdp);

            socket.emit("answer", {
                roomId,
                sdp : sdp
            });
        };

        const handleAnswer = async ({ sdp : remoteSdp }: { roomId: string; sdp : RTCSessionDescriptionInit })  => {
            setLobby(false);
            setConnectionState("connecting");
            try {
                if (!sendingPcRef.current) return;
                
                await sendingPcRef.current.setRemoteDescription(remoteSdp);
                console.log("Remote description set successfully.");

                pendingCandidates.current.receiver.forEach(candidate => {
                    sendingPcRef.current?.addIceCandidate(candidate).catch(console.error);
                });
                pendingCandidates.current.receiver = [];
                setConnectionState("connected");

            } catch (e) {
                console.error("Error setting remote description:", e);
            }
        };

        const handleLobby = () => {
            setLobby(true);
            setConnectionState("waiting");
            setAiSuggestions([]);
            setSharedInterests([]);
        };

        const handleSocketConnect = () => {
            setConnectionState("waiting");
            socket.emit("register-user", { name, interests });
        };

        const handleSocketDisconnect = () => {
            closePeerConnections();
            setLobby(true);
            setConnectionState("disconnected");
        };

        const handleMessage = (message: unknown) => {
            if (message === "lobby") {
                handleLobby();
            }
        };

        const handleAiSuggestions = (data: { sharedInterests: string[], suggestions: string[] }) => {
            console.log("Received AI Suggestions:", data);
            setSharedInterests(data.sharedInterests);
            setAiSuggestions(data.suggestions);
        };

        socket.on("connect", handleSocketConnect);
        socket.on("disconnect", handleSocketDisconnect);
        socket.on("message", handleMessage);
        socket.on('send-offer', handleSendOffer);
        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('lobby', handleLobby);
        socket.on("conversation-suggestions", handleAiSuggestions);
        socket.on("add-ice-candidate",({candidate, type})=>{
            console.log("Add ice candidate from remote");
            console.log({candidate, type});
            const targetPc = type === "sender" ? receivingPcRef.current : sendingPcRef.current;
            if (!targetPc) return;
            if (!targetPc.remoteDescription) {
                pendingCandidates.current[type as keyof typeof pendingCandidates.current].push(candidate);
                console.log(`Queued early ICE candidate for ${type}`);
            } else {
                targetPc.addIceCandidate(candidate).catch(e => console.error("Error adding ICE candidate", e));
            }
        } )

        return () => {
            closePeerConnections();
            socket.off("connect", handleSocketConnect);
            socket.off("disconnect", handleSocketDisconnect);
            socket.off("message", handleMessage);
            socket.off('send-offer', handleSendOffer);
            socket.off('offer', handleOffer);
            socket.off('answer', handleAnswer);
            socket.off('lobby', handleLobby);
            socket.off("conversation-suggestions", handleAiSuggestions);
            socket.close();
            socketRef.current = null;
        };
    }, [name, interests]);


    useEffect(() => {
        if (localVideoRef.current && localVideoTrack) {
            localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
            localVideoRef.current.play().catch(() => null);
        }
    }, [localVideoTrack]);

    const statusLabel = connectionState === "connected"
        ? "Connected"
        : connectionState === "disconnected"
            ? "Disconnected from server"
            : lobby
                ? "Waiting for a match"
                : "Connecting call";

    const statusClass = connectionState === "connected"
        ? "status-chip status-ok"
        : connectionState === "disconnected"
            ? "status-chip status-bad"
            : "status-chip status-warn";

    return <div className="page-shell">
        <div className="panel room-panel">
            <div className="room-header">
                <div>
                    <p className="eyebrow">You are in queue as {name}</p>
                    <h2>Live Match Room</h2>
                </div>
                <span className={statusClass}>{statusLabel}</span>
            </div>

            {!lobby && aiSuggestions.length > 0 && (
                    <div style={{ padding: "15px", backgroundColor: "#f3f4f6", borderRadius: "8px", marginBottom: "20px", textAlign: "left" }}>
                        <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem" }}>✨ AI Icebreakers</h3>
                        {sharedInterests.length > 0 ? (
                            <p style={{ margin: "0 0 10px 0", color: "#059669", fontWeight: "bold" }}>
                                You both like: {sharedInterests.join(", ")}!
                            </p>
                        ) : (
                            <p style={{ margin: "0 0 10px 0", color: "#6b7280", fontStyle: "italic" }}>
                                Finding common ground...
                            </p>
                        )}
                        <ul style={{ margin: 0, paddingLeft: "20px", color: "#374151" }}>
                            {aiSuggestions.map((suggestion, idx) => (
                                <li key={idx} style={{ marginBottom: "5px" }}>{suggestion}</li>
                            ))}
                        </ul>
                    </div>
                )}

            <div className="video-grid">
                <div className="video-block">
                    <p className="video-label">You</p>
                    <video autoPlay muted playsInline ref={localVideoRef} className="video-card" />
                </div>
                <div className="video-block">
                    <p className="video-label">Partner</p>
                    <video autoPlay playsInline ref={remoteVideoRef} className="video-card" />
                </div>
            </div>

            <div className="controls-row">
                <button className="secondary-btn" onClick={() => setIsAudioEnabled((prev) => !prev)}>
                    {isAudioEnabled ? "Mute" : "Unmute"}
                </button>
                <button className="secondary-btn" onClick={() => setIsVideoEnabled((prev) => !prev)}>
                    {isVideoEnabled ? "Camera Off" : "Camera On"}
                </button>
                <button
                    className="secondary-btn"
                    onClick={() => {
                        closePeerConnections();
                        setLobby(true);
                        setConnectionState("waiting");
                        socketRef.current?.disconnect();
                        socketRef.current?.connect();
                    }}
                >
                    Find New Match
                </button>
                <button
                    className="danger-btn"
                    onClick={() => {
                        closePeerConnections();
                        onLeave();
                    }}
                >
                    Leave
                </button>
            </div>
        </div>
    </div>
}
