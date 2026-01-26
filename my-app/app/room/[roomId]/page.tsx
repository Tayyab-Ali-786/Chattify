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
const PaperclipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
const PenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;

export default function Room() {
    const params = useParams();
    const searchParams = useSearchParams();
    const roomId = params?.roomId as string;
    const userName = searchParams.get('name') || "Anonymous";
    const router = useRouter();

    const { localStream, remoteStream, messages, sendMessage, sendFile, remoteUserName, toggleScreenShare, sendDrawing, remoteDrawingData, sendWhiteboardToggle, remoteWhiteboardOpen } = useWebRTC(roomId, userName);
    const [chatInput, setChatInput] = useState("");
    const [isSidebarOpen] = useState(true);
    const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
    const [drawColor, setDrawColor] = useState("#000000");
    const [lineWidth, setLineWidth] = useState(2);
    const [isDrawing, setIsDrawing] = useState(false);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            sendFile(file);
        }
        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

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

    // Sync Whiteboard State
    useEffect(() => {
        if (remoteWhiteboardOpen && !isWhiteboardOpen) {
            setIsWhiteboardOpen(true);
        }
    }, [remoteWhiteboardOpen]);

    // Auto-open if receiving drawing data (failsafe)
    useEffect(() => {
        if (remoteDrawingData && !isWhiteboardOpen) {
            setIsWhiteboardOpen(true);
        }
    }, [remoteDrawingData]);

    const toggleWhiteboard = () => {
        const newState = !isWhiteboardOpen;
        setIsWhiteboardOpen(newState);
        sendWhiteboardToggle(newState);
    };

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

    // Whiteboard Drawing Logic
    const drawLine = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsDrawing(true);
        lastPointRef.current = { x, y };
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !canvasRef.current || !lastPointRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Draw locally
        drawLine(ctx, lastPointRef.current.x, lastPointRef.current.y, x, y, drawColor, lineWidth);

        // Send to remote peer (normalized coordinates)
        sendDrawing({
            x: x / canvas.width,
            y: y / canvas.height,
            color: drawColor,
            lineWidth: lineWidth,
            isDrawing: true
        });

        lastPointRef.current = { x, y };
    };

    const handleCanvasMouseUp = () => {
        setIsDrawing(false);
        lastPointRef.current = null;
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // Handle remote drawing data
    useEffect(() => {
        if (!remoteDrawingData || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const x = remoteDrawingData.x * canvas.width;
        const y = remoteDrawingData.y * canvas.height;

        if (remoteDrawingData.isDrawing && lastPointRef.current) {
            drawLine(ctx, lastPointRef.current.x, lastPointRef.current.y, x, y, remoteDrawingData.color, remoteDrawingData.lineWidth);
        }

        lastPointRef.current = { x, y };
    }, [remoteDrawingData]);

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
                <Button onClick={handleLeave} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 gap-2">
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
                            <Button className="rounded-xl w-12 h-12 p-0 hover:bg-gray-800 text-gray-300 hover:text-white" onClick={() => {
                                if (localStream) {
                                    localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
                                }
                            }}>
                                <MicIcon />
                            </Button>
                            <Button className="rounded-xl w-12 h-12 p-0 hover:bg-gray-800 text-gray-300 hover:text-white" onClick={() => {
                                if (localStream) {
                                    localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
                                }
                            }}>
                                <VideoIcon />
                            </Button>
                            <div className="w-px bg-gray-700 mx-1"></div>
                            <Button className="rounded-xl h-12 px-4 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 gap-2" onClick={toggleScreenShare}>
                                <MonitorIcon />
                                <span className="hidden sm:inline">Share Screen</span>
                            </Button>
                            <div className="w-px bg-gray-700 mx-1"></div>
                            <Button
                                className={`rounded-xl h-12 px-4 gap-2 ${isWhiteboardOpen ? 'bg-purple-600/20 text-purple-300' : 'hover:bg-purple-600/20 text-purple-400 hover:text-purple-300'}`}
                                onClick={toggleWhiteboard}
                            >
                                <PenIcon />
                                <span className="hidden sm:inline">Whiteboard</span>
                            </Button>
                        </div>
                    </div>
                </main>

                {/* Whiteboard Panel */}
                {isWhiteboardOpen && (
                    <aside className="w-96 bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300">
                        <div className="p-4 border-b border-gray-800 font-semibold flex justify-between items-center">
                            Whiteboard
                            <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded">Live</span>
                        </div>
                        <div className="flex-1 p-4 flex flex-col gap-4">
                            <canvas
                                ref={canvasRef}
                                width={800}
                                height={600}
                                className="w-full bg-white rounded-lg cursor-crosshair border-2 border-gray-700 shadow-lg"
                                onMouseDown={handleCanvasMouseDown}
                                onMouseMove={handleCanvasMouseMove}
                                onMouseUp={handleCanvasMouseUp}
                                onMouseLeave={handleCanvasMouseUp}
                            />
                            <div className="flex flex-col gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                                <div className="flex items-center gap-3">
                                    <label className="text-sm text-gray-400 font-medium">Color:</label>
                                    <input
                                        type="color"
                                        value={drawColor}
                                        onChange={(e) => setDrawColor(e.target.value)}
                                        className="w-12 h-8 rounded cursor-pointer border border-gray-600"
                                    />
                                    <div className="flex gap-2 ml-auto">
                                        {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setDrawColor(color)}
                                                className="w-6 h-6 rounded-full border-2 border-gray-600 hover:scale-110 transition-transform"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="text-sm text-gray-400 font-medium">Width:</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={lineWidth}
                                        onChange={(e) => setLineWidth(Number(e.target.value))}
                                        className="flex-1"
                                    />
                                    <span className="text-sm text-gray-400 w-8">{lineWidth}px</span>
                                </div>
                                <Button
                                    onClick={clearCanvas}
                                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 gap-2 rounded-lg"
                                >
                                    <TrashIcon /> Clear Canvas
                                </Button>
                            </div>
                        </div>
                    </aside>
                )}


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
                                        {msg.type === 'file' ? (
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2 font-medium">
                                                    <PaperclipIcon />
                                                    <span className="truncate max-w-37.5">{msg.fileName || "File"}</span>
                                                </div>
                                                {msg.fileUrl && (
                                                    <a
                                                        href={msg.fileUrl}
                                                        download={msg.fileName}
                                                        className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs transition-colors"
                                                    >
                                                        <DownloadIcon /> Download
                                                    </a>
                                                )}
                                                <div className="text-[10px] opacity-70 border-t border-white/20 pt-1 mt-1">
                                                    {msg.message}
                                                </div>
                                            </div>
                                        ) : (
                                            msg.message
                                        )}
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
                            <form onSubmit={handleSendMessage} className="relative flex gap-2 items-center">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <Button
                                    type="button"
                                    onClick={handleFileClick}
                                    className="p-2 h-10 w-10 min-w-[2.5rem] rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all border border-gray-700"
                                >
                                    <PaperclipIcon />
                                </Button>
                                <div className="relative flex-1">
                                    <input
                                        className="w-full bg-gray-800 text-white rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all placeholder:text-gray-500"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder="Type a message..."
                                    />
                                    <Button
                                        type="submit"
                                        className="absolute right-1.5 top-1.5 h-8 w-8 p-0 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center"
                                        disabled={!chatInput.trim()}
                                    >
                                        <SendIcon />
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
