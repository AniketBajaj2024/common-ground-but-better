import { useEffect, useRef, useState } from "react";
import { Room } from "./Room";


export const Landing = ()=>{
    const [name , setName] = useState("");
    const [joined , setJoined] = useState(false);
    const [isRequestingMedia, setIsRequestingMedia] = useState(false);
    const [mediaError, setMediaError] = useState<string | null>(null);
    const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);
    const [interestsInput, setInterestsInput] = useState("");
    const videoRef = useRef<HTMLVideoElement>(null);

    const getCam = async ()=>{
        setIsRequestingMedia(true);
        setMediaError(null);
        try {
            const stream = await window.navigator.mediaDevices.getUserMedia({
                video: true,
                audio : true
            });
            const audioTrack = stream.getAudioTracks()[0] ?? null;
            const videoTrack = stream.getVideoTracks()[0] ?? null;

            setLocalAudioTrack(audioTrack);
            setLocalVideoTrack(videoTrack);

            if (!videoRef.current || !videoTrack) {
                return;
            }

            videoRef.current.srcObject = new MediaStream([videoTrack]);
            await videoRef.current.play().catch(() => null);
        } catch (error) {
            console.error("Could not access camera/microphone", error);
            setMediaError("Camera or microphone permission was denied. Please allow access and retry.");
        } finally {
            setIsRequestingMedia(false);
        }
    };

    useEffect(()=>{
        getCam();
    }, []);

    const canJoin = name.trim().length >= 2 && !!localAudioTrack && !!localVideoTrack;
    if (!joined) {
        return (
            <div className="page-shell">
                <div className="panel landing-panel">
                    <div>
                        <p className="eyebrow">Common Ground</p>
                        <h1>Talk to someone new in seconds</h1>
                        <p className="subtext">Set your name, add your interests, check your camera preview, and join the queue.</p>
                    </div>

                    <div className="preview-wrap">
                        <video autoPlay muted playsInline ref={videoRef} className="video-card" />
                    </div>

                    {mediaError ? <p className="error-text">{mediaError}</p> : null}

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginBottom: "15px" }}>
                        <div className="input-row">
                            <input
                                className="text-input"
                                type="text"
                                value={name}
                                placeholder="Enter your name"
                                onChange={(e) => setName(e.target.value)}
                            />
                            <button className="secondary-btn" onClick={getCam} disabled={isRequestingMedia}>
                                {isRequestingMedia ? "Checking..." : "Retry Camera"}
                            </button>
                        </div>
                        
                        {/* ✨ AI FEATURE: The new Interests Input */}
                        <input
                            className="text-input"
                            style={{ width: "100%" }}
                            type="text"
                            value={interestsInput}
                            placeholder="Interests (e.g., Coding, Anime, Hiking)..."
                            onChange={(e) => setInterestsInput(e.target.value)}
                        />
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
                            Separate multiple interests with a comma. We'll use these to generate AI icebreakers!
                        </p>
                    </div>

                    <button
                        className="primary-btn"
                        onClick={() => { setJoined(true); }}
                        disabled={!canJoin || isRequestingMedia}
                    >
                        Join Queue
                    </button>
                </div>
            </div>
        );
    }

    const parsedInterests = interestsInput
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

    return <Room
        name={name.trim()}
        interests={parsedInterests}
        localAudioTrack={localAudioTrack}
        localVideoTrack={localVideoTrack}
        onLeave={() => setJoined(false)}
    />
    
}