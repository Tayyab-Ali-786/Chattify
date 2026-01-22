"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const router = useRouter();

  const handleJoin = () => {
    if (roomId.trim() && userName.trim()) {
      router.push(`/room/${roomId}?name=${encodeURIComponent(userName)}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            MeetNow
          </h1>
          <p className="text-gray-400 text-sm">Premium Video Conferencing & Collaboration</p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="userName" className="block text-sm font-medium text-gray-300 ml-1">
              Your Name
            </label>
            <Input
              id="userName"
              placeholder="e.g. John Doe"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="bg-gray-900/50 border-gray-600 focus:border-blue-500 text-white placeholder:text-gray-500 h-10 transition-all hover:border-gray-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="roomId" className="block text-sm font-medium text-gray-300 ml-1">
              Room ID
            </label>
            <Input
              id="roomId"
              placeholder="e.g. project-meeting"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="bg-gray-900/50 border-gray-600 focus:border-blue-500 text-white placeholder:text-gray-500 h-10 transition-all hover:border-gray-500"
            />
          </div>
          <Button
            onClick={handleJoin}
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-900/20 transition-all transform hover:-translate-y-0.5"
            disabled={!roomId || !userName}
          >
            Join Room
          </Button>
        </div>

        <div className="text-center text-xs text-gray-500 mt-4">
          <p>Secure • Fast • Reliable</p>
        </div>
      </div>
    </div>
  );
}
