"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface UsernamePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UsernamePopup({ isOpen, onClose }: UsernamePopupProps) {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { updateUsername } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const success = await updateUsername(username.trim());
      if (success) {
        onClose();
      } else {
        setError("Username is already taken or invalid");
      }
    } catch {
      setError("Failed to update username. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative glass-box rounded-lg p-8 max-w-md w-full mx-4 animate-fadeIn">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white font-oxanium mb-2">
            Choose Your Username
          </h2>
          <p className="text-gray-300 font-oxanium">
            Please enter a username to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full px-4 py-3 rounded-lg bg-black/40 border border-amber-600/50 text-white placeholder-gray-400 font-oxanium focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all"
              maxLength={10}
              disabled={isLoading}
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-sm mt-2 font-oxanium">{error}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg border p-4 h-12 text-white border-amber-600 font-oxanium justify-center items-center flex bg-black/20 backdrop-blur-sm hover:bg-amber-600 hover:text-black transition-colors duration-300 shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Setting..." : "Set Username"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
