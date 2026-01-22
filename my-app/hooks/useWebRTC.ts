import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:3001";

export const useWebRTC = (roomId: string, userId: string) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [messages, setMessages] = useState<{ from: string; message: string }[]>([]);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

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
            })
            .catch((err) => console.error("Error accessing media devices:", err));

        return () => {
            newSocket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!socket || !roomId || !localStream) return;

        socket.emit("join-room", roomId);

        socket.on("user-joined", async (id) => {
            console.log("User joined:", id);
            const pc = createPeerConnection();
            peerConnectionRef.current = pc;

            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", { to: id, sdp: offer });
        });

        socket.on("offer", async ({ from, sdp }) => {
            console.log("Received offer from:", from);
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
            setMessages((prev) => [...prev, { from, message }]);
        });

        return () => {
            socket.off("user-joined");
            socket.off("offer");
            socket.off("answer");
            socket.off("candidate");
            socket.off("chat-message");
        };
    }, [socket, roomId, localStream, createPeerConnection]);

    const sendMessage = (message: string) => {
        if (socket && roomId) {
            socket.emit("chat-message", { to: roomId, message });
            setMessages((prev) => [...prev, { from: 'me', message }]);
        }
    };

    // Switch to screen sharing
    const startScreenShare = useCallback(async () => {
        try {
            const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];

            if (peerConnectionRef.current && localStream) {
                // Replace the video track in the peer connection
                const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(screenTrack);
                }
            }

            // When screen sharing stops, switch back to camera
            screenTrack.onended = () => {
                stopScreenShare();
            };

            // Update local stream for UI
            setLocalStream(prev => {
                if (!prev) return screenStream;
                const newStream = new MediaStream([
                    screenTrack,
                    ...prev.getAudioTracks()
                ]);
                return newStream;
            });
        } catch (err) {
            console.error("Error sharing screen:", err);
        }
    }, [peerConnectionRef, localStream]);

    // Switch back to camera
    const stopScreenShare = useCallback(async () => {
        try {
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const cameraTrack = cameraStream.getVideoTracks()[0];

            if (peerConnectionRef.current) {
                const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(cameraTrack);
                }
            }

            setLocalStream(cameraStream);
        } catch (err) {
            console.error("Error switching back to camera:", err);
        }
    }, [peerConnectionRef]);

    return { localStream, remoteStream, messages, sendMessage, startScreenShare, stopScreenShare };
};
