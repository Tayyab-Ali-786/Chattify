import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { generateKeyPair, exportPublicKey, importPublicKey, deriveSharedSecret, encrypt, decrypt, encryptBinary, decryptBinary } from "@/lib/encryption";

const SOCKET_URL = "http://localhost:3001";

export type DrawingData = {
    x: number;
    y: number;
    color: string;
    lineWidth: number;
    isDrawing: boolean;
};

export const useWebRTC = (roomId: string, userName: string) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteUserName, setRemoteUserName] = useState<string | null>(null);
    // Data Channel & File Sharing Refs
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const incomingFileMetaRef = useRef<{ name: string; size: number; fileType: string } | null>(null);
    const incomingFileBufferRef = useRef<ArrayBuffer[]>([]);
    const receivedSizeRef = useRef(0);

    const [messages, setMessages] = useState<{ from: string; message: string; type: 'text' | 'file'; fileUrl?: string; fileName?: string }[]>([]);
    const [remoteDrawingData, setRemoteDrawingData] = useState<DrawingData | null>(null);
    const [remoteWhiteboardOpen, setRemoteWhiteboardOpen] = useState(false);
    const [isEncrypted, setIsEncrypted] = useState(false);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const candidatesQueue = useRef<RTCIceCandidate[]>([]);
    const isProcessingQueue = useRef(false);

    // Encryption keys
    const encryptionKeyRef = useRef<CryptoKey | null>(null);
    const privateKeyRef = useRef<CryptoKey | null>(null);
    const publicKeyRef = useRef<CryptoKey | null>(null);

    const processCandidatesQueue = async () => {
        if (!peerConnectionRef.current || !peerConnectionRef.current.remoteDescription || isProcessingQueue.current) return;

        isProcessingQueue.current = true;
        while (candidatesQueue.current.length > 0) {
            const candidate = candidatesQueue.current.shift();
            if (candidate) {
                try {
                    await peerConnectionRef.current.addIceCandidate(candidate);
                } catch (e) {
                    console.error("Error adding ice candidate", e);
                }
            }
        }
        isProcessingQueue.current = false;
    };

    const setupDataChannel = (channel: RTCDataChannel) => {
        channel.onopen = () => {
            console.log("Data Channel Open");
        };
        channel.binaryType = "arraybuffer";

        channel.onmessage = async (event) => {
            const { data } = event;

            if (typeof data === 'string') {
                try {
                    let parsed = JSON.parse(data);

                    // Decrypt if encrypted
                    if (parsed.encrypted && encryptionKeyRef.current) {
                        const decrypted = await decrypt(parsed.data, encryptionKeyRef.current);
                        parsed = JSON.parse(decrypted);
                    }

                    if (parsed.type === 'file-meta') {
                        incomingFileMetaRef.current = parsed;
                        incomingFileBufferRef.current = [];
                        receivedSizeRef.current = 0;
                        console.log("Receiving file:", parsed.name, "Size:", parsed.size, "bytes");
                    } else if (parsed.type === 'file-end') {
                        console.log("Received file-end signal");
                        // File should already be complete based on size check
                    } else if (parsed.type === 'drawing-data') {
                        // Handle drawing data from remote peer
                        setRemoteDrawingData({
                            x: parsed.x,
                            y: parsed.y,
                            color: parsed.color,
                            lineWidth: parsed.lineWidth,
                            isDrawing: parsed.isDrawing
                        });
                    } else if (parsed.type === 'whiteboard-toggle') {
                        setRemoteWhiteboardOpen(parsed.isOpen);
                        console.log("Remote whiteboard toggled:", parsed.isOpen);
                    }
                } catch (e) {
                    console.error("Error parsing data channel message", e);
                }
            } else if (data instanceof ArrayBuffer) {
                if (!incomingFileMetaRef.current) {
                    console.warn("Received file data without metadata");
                    return;
                }

                incomingFileBufferRef.current.push(data);
                receivedSizeRef.current += data.byteLength;
                console.log(`Received chunk: ${receivedSizeRef.current}/${incomingFileMetaRef.current.size} bytes`);

                if (receivedSizeRef.current >= incomingFileMetaRef.current.size) {
                    console.log("File reception complete, creating blob");
                    const blob = new Blob(incomingFileBufferRef.current, { type: incomingFileMetaRef.current.fileType });
                    const url = URL.createObjectURL(blob);

                    setMessages((prev) => [
                        ...prev,
                        {
                            from: 'Peer',
                            message: `Sent a file: ${incomingFileMetaRef.current?.name}`,
                            type: 'file',
                            fileUrl: url,
                            fileName: incomingFileMetaRef.current?.name
                        }
                    ]);

                    console.log("File added to messages:", incomingFileMetaRef.current.name);

                    // Reset
                    incomingFileMetaRef.current = null;
                    incomingFileBufferRef.current = [];
                    receivedSizeRef.current = 0;
                }
            }
        };
    };

    const createPeerConnection = useCallback((isOfferer: boolean) => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
            ],
        });

        if (isOfferer) {
            const channel = pc.createDataChannel("files");
            dataChannelRef.current = channel;
            setupDataChannel(channel);
        } else {
            pc.ondatachannel = (event) => {
                dataChannelRef.current = event.channel;
                setupDataChannel(event.channel);
            };
        }

        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit("candidate", { to: roomId, candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        return pc;
    }, [socket, roomId, setupDataChannel]);

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
    const isScreenSharingRef = useRef(false);

    const toggleScreenShare = async () => {
        if (isScreenSharingRef.current) {
            await stopScreenShare();
        } else {
            await startScreenShare();
        }
    };

    const startScreenShare = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];

            if (peerConnectionRef.current) {
                const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    await sender.replaceTrack(screenTrack);
                }
            }

            const audioTrack = localStreamRef.current?.getAudioTracks()[0];
            const newStream = new MediaStream([screenTrack, ...(audioTrack ? [audioTrack] : [])]);
            setLocalStream(newStream);
            localStreamRef.current = newStream;
            isScreenSharingRef.current = true;

            screenTrack.onended = () => {
                stopScreenShare();
            };

        } catch (err) {
            console.error("Error starting screen share:", err);
        }
    };

    const stopScreenShare = async () => {
        if (!isScreenSharingRef.current) return;

        try {
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const cameraTrack = cameraStream.getVideoTracks()[0];

            if (peerConnectionRef.current) {
                const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    await sender.replaceTrack(cameraTrack);
                }
            }

            // Stop the screen track if it is still running (e.g. manual toggle)
            if (localStreamRef.current) {
                localStreamRef.current.getVideoTracks().forEach(track => {
                    if (track.label.toLowerCase().includes('screen') || track.label.toLowerCase().includes('window')) {
                        track.stop();
                    }
                });
            }

            const newStream = new MediaStream([cameraTrack, cameraStream.getAudioTracks()[0]]);
            setLocalStream(newStream);
            localStreamRef.current = newStream;
            isScreenSharingRef.current = false;

        } catch (err) {
            console.error("Error reverting to camera:", err);
        }
    };


    const hasJoined = useRef(false);

    useEffect(() => {
        hasJoined.current = false;
    }, [roomId]);

    useEffect(() => {
        if (!socket || !roomId) return; // Removed localStream dependency to prevent re-runs on stream switch

        // Wait for local stream to be ready before joining if it's the first time?
        // Actually we need 'localStream' to add tracks. 
        // We can check localStreamRef.
        if (!localStreamRef.current && !localStream) return;

        // Join with name only if not already joined for this room session
        if (!hasJoined.current) {
            socket.emit("join-room", { roomId, userName });
            hasJoined.current = true;
        }

        const handleUserJoined = async ({ id, name }: { id: string, name: string }) => {
            console.log("User joined:", id, name);
            setRemoteUserName(name || "Unknown User");

            // Generate encryption keys
            try {
                const keyPair = await generateKeyPair();
                privateKeyRef.current = keyPair.privateKey;
                publicKeyRef.current = keyPair.publicKey;

                // Export and send public key
                const exportedKey = await exportPublicKey(keyPair.publicKey);
                socket.emit("public-key", { to: id, publicKey: exportedKey });
                console.log("🔐 Sent public key for encryption");
            } catch (error) {
                console.error("Error generating encryption keys:", error);
            }

            const pc = createPeerConnection(true);
            peerConnectionRef.current = pc;

            const streamToAdd = localStreamRef.current || localStream;
            if (streamToAdd) {
                streamToAdd.getTracks().forEach(track => {
                    pc.addTrack(track, streamToAdd);
                });
            }

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", { to: id, sdp: offer, userName });
        };

        const handleOffer = async ({ from, sdp, name }: { from: string, sdp: RTCSessionDescriptionInit, name: string }) => {
            console.log("Received offer from:", from, name);
            setRemoteUserName(name || "Unknown User");
            const pc = createPeerConnection(false);
            peerConnectionRef.current = pc;

            const streamToAdd = localStreamRef.current || localStream;
            if (streamToAdd) {
                streamToAdd.getTracks().forEach(track => {
                    pc.addTrack(track, streamToAdd);
                });
            }

            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            await processCandidatesQueue();

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("answer", { to: from, sdp: answer });
        };

        const handleAnswer = async ({ from, sdp }: { from: string, sdp: RTCSessionDescriptionInit }) => {
            console.log("Received answer from:", from);
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
                await processCandidatesQueue();
            }
        };

        const handleCandidate = async ({ from, candidate }: { from: string, candidate: RTCIceCandidateInit }) => {
            const iceCandidate = new RTCIceCandidate(candidate);
            if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
                try {
                    await peerConnectionRef.current.addIceCandidate(iceCandidate);
                } catch (e) {
                    console.error("Error adding candidate directly", e);
                }
            } else {
                candidatesQueue.current.push(iceCandidate);
            }
        };

        const handleChatMessage = ({ from, message }: { from: string, message: string }) => {
            setMessages((prev) => [...prev, { from, message, type: 'text' }]);
        };

        socket.on("user-joined", handleUserJoined);
        socket.on("offer", handleOffer);
        socket.on("answer", handleAnswer);
        socket.on("candidate", handleCandidate);
        socket.on("chat-message", handleChatMessage);

        return () => {
            socket.off("user-joined", handleUserJoined);
            socket.off("offer", handleOffer);
            socket.off("answer", handleAnswer);
            socket.off("candidate", handleCandidate);
            socket.off("chat-message", handleChatMessage);
        };
    }, [socket, roomId, createPeerConnection, userName]); // Removed localStream

    const sendMessage = (message: string) => {
        if (socket && roomId) {
            const msgContent = `${userName}: ${message}`;
            socket.emit("chat-message", { to: roomId, message: msgContent });
            setMessages((prev) => [...prev, { from: 'me', message: msgContent, type: 'text' }]);
        }
    };

    const sendFile = (file: File) => {
        if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
            alert("Connection not established with peer. Cannot send file.");
            return;
        }

        const CHUNK_SIZE = 16384; // 16KB chunks
        const metadata = {
            type: 'file-meta',
            name: file.name,
            size: file.size,
            fileType: file.type
        };

        try {
            // Send metadata first
            dataChannelRef.current.send(JSON.stringify(metadata));
            console.log("Sending file metadata:", metadata);

            // Read and send file in chunks
            let offset = 0;
            const reader = new FileReader();

            const readSlice = () => {
                const slice = file.slice(offset, offset + CHUNK_SIZE);
                reader.readAsArrayBuffer(slice);
            };

            reader.onload = () => {
                if (reader.result instanceof ArrayBuffer && dataChannelRef.current) {
                    try {
                        dataChannelRef.current.send(reader.result);
                        offset += reader.result.byteLength;
                        console.log(`Sent chunk: ${offset}/${file.size} bytes`);

                        if (offset < file.size) {
                            // Read next chunk
                            readSlice();
                        } else {
                            // File transfer complete
                            console.log("File transfer complete");

                            // Send end signal
                            dataChannelRef.current.send(JSON.stringify({ type: 'file-end' }));

                            // Optimistic update for sender
                            const url = URL.createObjectURL(file);
                            setMessages((prev) => [
                                ...prev,
                                {
                                    from: 'me',
                                    message: `Sent a file: ${file.name}`,
                                    type: 'file',
                                    fileUrl: url,
                                    fileName: file.name
                                }
                            ]);
                        }
                    } catch (error) {
                        console.error("Error sending chunk:", error);
                        alert("Failed to send file chunk.");
                    }
                }
            };

            reader.onerror = (error) => {
                console.error("Error reading file:", error);
                alert("Failed to read file.");
            };

            // Start reading the first chunk
            readSlice();
        } catch (error) {
            console.error("Error sending file:", error);
            alert("Failed to send file.");
        }
    };

    const sendDrawing = (drawingData: DrawingData) => {
        if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
            return;
        }

        try {
            const message = {
                type: 'drawing-data',
                ...drawingData
            };
            dataChannelRef.current.send(JSON.stringify(message));
        } catch (error) {
            console.error("Error sending drawing data:", error);
        }
    };

    const sendWhiteboardToggle = (isOpen: boolean) => {
        if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
            return;
        }
        try {
            dataChannelRef.current.send(JSON.stringify({ type: 'whiteboard-toggle', isOpen }));
        } catch (error) {
            console.error("Error sending whiteboard toggle:", error);
        }
    };

    return { localStream, remoteStream, messages, sendMessage, sendFile, remoteUserName, toggleScreenShare, sendDrawing, remoteDrawingData, sendWhiteboardToggle, remoteWhiteboardOpen };
};
