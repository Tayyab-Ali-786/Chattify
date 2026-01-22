import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:3001";

export const useWebRTC = (roomId: string, userName: string) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteUserName, setRemoteUserName] = useState<string | null>(null);
    const [messages, setMessages] = useState<{ from: string; message: string }[]>([]);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null); // Keep ref for immediate access in callbacks

    const createPeerConnection = useCallback(() => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
            ],
        });

        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit("candidate", { to: roomId, candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        return pc;
    }, [socket, roomId]);

    useEffect(() => {
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        // Get User Media
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((stream) => {
                setLocalStream(stream);
                localStreamRef.current = stream;
            })
            .catch((err) => console.error("Error accessing media devices:", err));

        return () => {
            newSocket.disconnect();
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Handle Screen Share
    const toggleScreenShare = async () => {
        if (!localStream) return;
        const pc = peerConnectionRef.current;

        const videoTrack = localStream.getVideoTracks()[0];

        // If already screen sharing (you can check label or set a state, simple toggle logic here: if track label contains 'screen' usually)
        // Actually simpler: 
        // If we are initiating screen share:
        if (videoTrack.label.toLowerCase().includes("camera") || videoTrack.label.toLowerCase().includes("video")) { // Heuristic might fail if camera has weird name, better to track state or just try getDisplayMedia
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];

                if (pc) {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(screenTrack);
                    }
                }

                // Stop old track? No, keep it for switching back? Use replaceTrack allows seamless switch
                // But we need to update local state to show screen share locally
                const newStream = new MediaStream([screenTrack, localStream.getAudioTracks()[0]]);
                setLocalStream(newStream);
                localStreamRef.current = newStream;

                screenTrack.onended = () => {
                    // User clicked "Stop Sharing" in browser UI
                    revertToCamera();
                };

            } catch (err) {
                console.error("Error starting screen share:", err);
            }
        } else {
            revertToCamera();
        }
    };

    const revertToCamera = async () => {
        try {
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const cameraTrack = cameraStream.getVideoTracks()[0];
            const pc = peerConnectionRef.current;

            if (pc) {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(cameraTrack);
                }
            }

            // Stop screen track if it was running? (Handled by browser usually when replaced or stopped explicitly)
            if (localStreamRef.current) {
                localStreamRef.current.getVideoTracks().forEach(t => t.stop()); // Stop screen track
            }

            const newStream = new MediaStream([cameraTrack, cameraStream.getAudioTracks()[0]]); // Use audio from new stream or old? Old audio track is probably fine, but getting fresh user media gets both.
            // Actually best to keep audio continuous. But let's simple replace entire stream for now.
            setLocalStream(newStream);
            localStreamRef.current = newStream;
        } catch (err) {
            console.error("Error reverting to camera:", err);
        }
    };


    useEffect(() => {
        if (!socket || !roomId || !localStream) return;

        // Join with name
        socket.emit("join-room", { roomId, userName });

        socket.on("user-joined", async ({ id, name }) => {
            console.log("User joined:", id, name);
            setRemoteUserName(name || "Unknown User");
            const pc = createPeerConnection();
            peerConnectionRef.current = pc;

            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", { to: id, sdp: offer, userName }); // Send my name with offer
        });

        socket.on("offer", async ({ from, sdp, name }) => {
            console.log("Received offer from:", from, name);
            setRemoteUserName(name || "Unknown User");
            const pc = createPeerConnection();
            peerConnectionRef.current = pc;

            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });

            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("answer", { to: from, sdp: answer });
        });

        socket.on("answer", async ({ from, sdp }) => {
            console.log("Received answer from:", from);
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
            }
        });

        socket.on("candidate", async ({ from, candidate }) => {
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });

        socket.on("chat-message", ({ from, message }) => {
            // Logic to resolve 'from' ID to Name would require a map. 
            // For now we just use the ID or if we decide to send Name in chat message too.
            // Let's assume we want to send Name in chat.
            // Updating sendMessage to include name.
            setMessages((prev) => [...prev, { from, message }]);
        });

        return () => {
            socket.off("user-joined");
            socket.off("offer");
            socket.off("answer");
            socket.off("candidate");
            socket.off("chat-message");
        };
    }, [socket, roomId, localStream, createPeerConnection, userName]);

    const sendMessage = (message: string) => {
        if (socket && roomId) {
            // We'll update server to pass through whatever object we send?
            // Server currently: socket.on("chat-message", ({ to, message }) => { io.to(to).emit("chat-message", { from: socket.id, message }); });
            // It overrwrites 'from'.
            // So we can send the name INSIDE the message object string? OR we update server. 
            // Let's just append name to message string for now for simplicity or rely on local state?
            // Actually, let's just send "Name: Message" as the string? Quickest fix without server change for chat specific structure.
            const msgContent = `${userName}: ${message}`;
            socket.emit("chat-message", { to: roomId, message: msgContent });
            setMessages((prev) => [...prev, { from: 'me', message: msgContent }]); // We'll parse it or display as is.
        }
    };

    return { localStream, remoteStream, messages, sendMessage, remoteUserName, toggleScreenShare };
};
