"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useWebRTC } from "@/hooks/useWebRTC";
import { Button } from "@/components/ui/button";

// Icons (Simple SVGs)
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>;
const VideoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>;
const MonitorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;
const LogOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;

export default function Room() {
    const params = useParams();
    const searchParams = useSearchParams();
    const roomId = params?.roomId as string;
    const userName = searchParams.get('name') || "Anonymous";
    const router = useRouter();

    const { localStream, remoteStream, messages, sendMessage, remoteUserName, toggleScreenShare } = useWebRTC(roomId, userName);
    const [chatInput, setChatInput] = useState("");
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
        <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden font-sans">
            {/* Header */}
            <header className="px-6 py-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center shrink-0 z-10 shadow-md">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <VideoIcon />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-wide">Room: <span className="text-blue-400">{roomId}</span></h1>
                        <p className="text-xs text-gray-400">Logged in as: {userName}</p>
                    </div>
                </div>
                <Button onClick={handleLeave} variant="destructive" className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 gap-2">
                    <LogOutIcon /> Leave
                </Button>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content */}
                <main className="flex-1 flex flex-col p-6 gap-6 overflow-hidden relative">
                    <div className="flex-1 relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex items-center justify-center group">
                        {/* Remote Video */}
                        {remoteStream ? (
                            <div className="relative w-full h-full">
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-contain bg-black"
                                />
                                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-sm font-medium border border-white/10">
                                    {remoteUserName}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-gray-500 animate-pulse">
                                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                                    <span className="text-2xl">...</span>
                                </div>
                                <p>Waiting for others to join...</p>
                            </div>
                        )}

                        {/* Local Video (Floating) */}
                        <div className="absolute bottom-6 right-6 w-64 aspect-video bg-gray-800 rounded-xl overflow-hidden border-2 border-gray-700 shadow-2xl transition-all hover:scale-105 z-20">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-xs border border-white/10">
                                You
                            </div>
                        </div>
                    </div>

                    {/* Bottom Controls */}
                    <div className="flex justify-center gap-4 shrink-0 pb-2">
                        <div className="bg-gray-900 p-2 rounded-2xl border border-gray-800 flex gap-2 shadow-lg">
                            <Button variant="ghost" className="rounded-xl w-12 h-12 p-0 hover:bg-gray-800 text-gray-300 hover:text-white" onClick={() => {
                                if (localStream) {
                                    localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
                                }
                            }}>
                                <MicIcon />
                            </Button>
                            <Button variant="ghost" className="rounded-xl w-12 h-12 p-0 hover:bg-gray-800 text-gray-300 hover:text-white" onClick={() => {
                                if (localStream) {
                                    localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
                                }
                            }}>
                                <VideoIcon />
                            </Button>
                            <div className="w-px bg-gray-700 mx-1"></div>
                            <Button variant="ghost" className="rounded-xl h-12 px-4 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 gap-2" onClick={toggleScreenShare}>
                                <MonitorIcon />
                                <span className="hidden sm:inline">Share Screen</span>
                            </Button>
                        </div>
                    </div>
                </main>

                {/* Chat Sidebar */}
                {isSidebarOpen && (
                    <aside className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col transition-all duration-300">
                        <div className="p-4 border-b border-gray-800 font-semibold flex justify-between items-center">
                            Chat
                            <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">Live</span>
                        </div>
                        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-800">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col ${msg.from === 'me' ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-3 rounded-2xl max-w-[85%] text-sm shadow-sm ${msg.from === 'me' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-800 text-gray-200 rounded-tl-sm'}`}>
                                        {/* Parse Name if format "Name: Message" */}
                                        {msg.message}
                                    </div>
                                </div>
                            ))}
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600 text-sm gap-2 opacity-50">
                                    <span className="text-2xl">💬</span>
                                    <p>No messages yet</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-800 bg-gray-900">
                            <form onSubmit={handleSendMessage} className="relative">
                                <input
                                    className="w-full bg-gray-800 text-white rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all placeholder:text-gray-500"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Type a message..."
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="absolute right-1.5 top-1.5 h-8 w-8 p-0 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center"
                                    disabled={!chatInput.trim()}
                                >
                                    <SendIcon />
                                </Button>
                            </form>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
