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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cyan-200">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 text-white p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md p-8 space-y-8 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-pink-900/40 backdrop-blur-2xl rounded-3xl shadow-2xl border border-cyan-500/20 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-block p-3 bg-gradient-to-br from-cyan-500 to-pink-500 rounded-2xl mb-2">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-cyan-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
            MeetNow
          </h1>
          <p className="text-cyan-200/80 text-sm font-medium">Premium Video Conferencing & Collaboration</p>
        </div>

        {!session ? (
          // Login/Signup Form
          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-semibold text-cyan-100 ml-1">
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-indigo-950/50 border-2 border-cyan-500/30 focus:border-cyan-400 text-white placeholder:text-purple-300/50 h-12 rounded-xl transition-all hover:border-cyan-500/50 focus:ring-2 focus:ring-cyan-400/20"
                  required={isSignUp}
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-cyan-100 ml-1">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-indigo-950/50 border-2 border-cyan-500/30 focus:border-cyan-400 text-white placeholder:text-purple-300/50 h-12 rounded-xl transition-all hover:border-cyan-500/50 focus:ring-2 focus:ring-cyan-400/20"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-cyan-100 ml-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-indigo-950/50 border-2 border-cyan-500/30 focus:border-cyan-400 text-white placeholder:text-purple-300/50 h-12 rounded-xl transition-all hover:border-cyan-500/50 focus:ring-2 focus:ring-cyan-400/20"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-pink-500/20 border-2 border-pink-400/30 rounded-xl text-pink-200 text-sm font-medium backdrop-blur-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-400 hover:via-purple-400 hover:to-pink-400 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all transform hover:scale-[1.02] hover:shadow-cyan-500/50"
              disabled={loading}
            >
              {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors font-medium"
              >
                {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        ) : (
          // Room Join Form (when authenticated)
          <div className="space-y-5">
            <div className="p-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-2 border-cyan-400/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold">
                  {session.user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-cyan-100 text-sm font-bold">
                    Welcome back, {session.user?.name}!
                  </p>
                  <p className="text-purple-200/70 text-xs">{session.user?.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="roomId" className="block text-sm font-semibold text-cyan-100 ml-1">
                Room ID
              </label>
              <Input
                id="roomId"
                placeholder="e.g. project-meeting"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleJoin()}
                className="bg-indigo-950/50 border-2 border-cyan-500/30 focus:border-cyan-400 text-white placeholder:text-purple-300/50 h-12 rounded-xl transition-all hover:border-cyan-500/50 focus:ring-2 focus:ring-cyan-400/20"
              />
            </div>

            <Button
              onClick={handleJoin}
              className="w-full h-12 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-400 hover:via-purple-400 hover:to-pink-400 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all transform hover:scale-[1.02] hover:shadow-cyan-500/50"
              disabled={!roomId}
            >
              Join Room
            </Button>

            <Button
              onClick={handleLogout}
              className="w-full h-11 border-2 border-pink-500/30 bg-pink-500/10 text-pink-200 hover:bg-pink-500/20 hover:border-pink-400/50 transition-all rounded-xl font-semibold"
            >
              Sign Out
            </Button>
          </div>
        )}

        <div className="text-center space-y-2 pt-2">
          <div className="flex items-center justify-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
              Secure
            </span>
            <span className="flex items-center gap-1.5 text-purple-300">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></span>
              Encrypted
            </span>
            <span className="flex items-center gap-1.5 text-pink-300">
              <span className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></span>
              Fast
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
