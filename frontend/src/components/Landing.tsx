import { useEffect, useRef, useState } from "react";
import { Room } from "./Room";


export const Landing = ()=>{
    const [name , setName] = useState("");
    const [joined , setJoined] = useState(false);
    const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // to open camera
    const getCam = async ()=>{
        //  window.navigator.mediaDevices.getUserMedia it ask it for camera and mic
        const stream = await window.navigator.mediaDevices.getUserMedia({
            video: true,
            audio : true
        });
        const audioTrack = stream.getAudioTracks()[0]; // getAudioTracks() it is giving all the mic presenet similarly with the video
        const videoTrack = stream.getVideoTracks()[0];
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        if(!videoRef.current){
            return;
        }
        videoRef.current.srcObject = new MediaStream([videoTrack]);
        videoRef.current.play();

    }
    useEffect(()=>{
        getCam();
    }, [videoRef]);


    if (!joined){
        return <div>
        <video autoPlay ref={videoRef}></video>
        <input type="text" onChange={(e)=>{
            setName(e.target.value);
        }}>
        </input>
        <button onClick={()=>{setJoined(true);}}>Join</button>
    </div>
    }
    return <Room name= {name} localAudioTrack = {localAudioTrack} localVideoTrack = {localVideoTrack}/>
    
}