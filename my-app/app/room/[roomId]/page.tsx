"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWebRTC } from "@/hooks/useWebRTC";
import { Button } from "@/components/ui/button";

export default function Room() {
    const params = useParams();
    const roomId = params?.roomId as string;
    const userId = useRef(Math.random().toString(36).substring(7)).current;
    const router = useRouter();

    const { localStream, remoteStream, messages, sendMessage } = useWebRTC(roomId, userId);
    const [chatInput, setChatInput] = useState("");

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const handleLeave = () => {
        router.push("/");
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim()) {
            sendMessage(chatInput);
            setChatInput("");
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <header className="p-4 bg-gray-800 flex justify-between items-center shrink-0">
                <h1 className="text-xl font-bold">Room: {roomId}</h1>
                <Button onClick={handleLeave} variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">
                    Leave Room
                </Button>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden relative">
                    {/* Main Video Area */}
                    <div className="flex-1 relative bg-black rounded-lg overflow-hidden flex items-center justify-center">
                        {remoteStream ? (
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="text-gray-500">Waiting for others to join...</div>
                        )}

                        {/* Local Video (PIP) */}
                        <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 shadow-lg z-10">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    {/* Controls Bar */}
                    <div className="flex justify-center gap-4 shrink-0">
                        <Button variant="outline" className="text-black bg-white hover:bg-gray-200" onClick={() => {
                            if (localStream) {
                                localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
                            }
                        }}>
                            Toggle Audio
                        </Button>
                        <Button variant="outline" className="text-black bg-white hover:bg-gray-200" onClick={() => {
                            if (localStream) {
                                localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
                            }
                        }}>
                            Toggle Video
                        </Button>
                    </div>
                </main>

                {/* Chat Sidebar */}
                <aside className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-700 font-semibold">
                        Chat
                    </div>
                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.from === 'me' ? 'items-end' : 'items-start'}`}>
                                <div className={`p-2 rounded-lg max-w-[80%] break-words ${msg.from === 'me' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                    <span className="text-xs opacity-50 block mb-1">{msg.from === 'me' ? 'You' : msg.from.substring(0, 5)}</span>
                                    {msg.message}
                                </div>
                            </div>
                        ))}
                        {messages.length === 0 && <div className="text-gray-500 text-center text-sm mt-4">No messages yet</div>}
                    </div>
                    <div className="p-4 border-t border-gray-700">
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input
                                className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Type a message..."
                            />
                            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700">Send</Button>
                        </form>
                    </div>
                </aside>
            </div>
        </div>
    );
}
