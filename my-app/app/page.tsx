"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { data: session, status } = useSession();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        name: isSignUp ? name : undefined,
        isSignUp: isSignUp.toString(),
        redirect: false
      });

      if (result?.error) {
        setError(result.error);
      } else {
        // Successfully authenticated
        setEmail("");
        setPassword("");
        setName("");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = () => {
    if (roomId.trim() && session?.user) {
      router.push(`/room/${roomId}`);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            MeetNow
          </h1>
          <p className="text-gray-400 text-sm">Premium Video Conferencing & Collaboration</p>
        </div>

        {!session ? (
          // Login/Signup Form
          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 ml-1">
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-gray-900/50 border-gray-600 focus:border-blue-500 text-white placeholder:text-gray-500 h-10 transition-all hover:border-gray-500"
                  required={isSignUp}
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 ml-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-900/50 border-gray-600 focus:border-blue-500 text-white placeholder:text-gray-500 h-10 transition-all hover:border-gray-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 ml-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-900/50 border-gray-600 focus:border-blue-500 text-white placeholder:text-gray-500 h-10 transition-all hover:border-gray-500"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-900/20 transition-all transform hover:-translate-y-0.5"
              disabled={loading}
            >
              {loading ? "Processing..." : isSignUp ? "Sign Up" : "Log In"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {isSignUp ? "Already have an account? Log in" : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        ) : (
          // Room Join Form (when authenticated)
          <div className="space-y-5">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm font-medium">
                Welcome, {session.user?.name}!
              </p>
              <p className="text-gray-400 text-xs mt-1">{session.user?.email}</p>
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
                onKeyPress={(e) => e.key === "Enter" && handleJoin()}
                className="bg-gray-900/50 border-gray-600 focus:border-blue-500 text-white placeholder:text-gray-500 h-10 transition-all hover:border-gray-500"
              />
            </div>

            <Button
              onClick={handleJoin}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-900/20 transition-all transform hover:-translate-y-0.5"
              disabled={!roomId}
            >
              Join Room
            </Button>

            <Button
              onClick={handleLogout}
              className="w-full h-10 border border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700 hover:text-white transition-all"
            >
              Log Out
            </Button>
          </div>
        )}

        <div className="text-center text-xs text-gray-500 mt-4">
          <p>🔒 Secure • 🚀 Fast • ✨ Encrypted</p>
        </div>
      </div>
    </div>
  );
}
