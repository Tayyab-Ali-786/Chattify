"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebRTC } from "@/hooks/useWebRTC";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const router = useRouter();
  const userId = "some-user-id"; // Replace with actual user ID logic
  const { localStream, remoteStream, startScreenShare, stopScreenShare } = useWebRTC(roomId, userId);

  const handleJoin = () => {
    if (roomId.trim()) {
      router.push(`/room/${roomId}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
          Join a Video Room
        </h1>
        <div className="space-y-4">
          <div>
            <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Room ID
            </label>
            <Input
              id="roomId"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={handleJoin} className="w-full" disabled={!roomId}>
            Join Room
          </Button>
          <div className="flex space-x-4">
            <Button onClick={startScreenShare} className="w-full">
              Share Screen
            </Button>
            <Button onClick={stopScreenShare} className="w-full">
              Stop Sharing
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
