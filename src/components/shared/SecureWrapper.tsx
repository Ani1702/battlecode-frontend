"use client";

import { useEffect, useState, useRef } from "react";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";

export default function SecureWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { socket, isConnected } = useSocket();
  const { userId } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [fullscreenViolations, setFullscreenViolations] = useState<
    Array<{ timestamp: number; message: string }>
  >(() => {
    // Load violations from sessionStorage on mount
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("fullscreen_violations");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse stored violations:", e);
          return [];
        }
      }
    }
    return [];
  });
  const violationsRef = useRef<Array<{ timestamp: number; message: string }>>(
    [],
  );

  // Keep ref in sync with state
  useEffect(() => {
    violationsRef.current = fullscreenViolations;
  }, [fullscreenViolations]);

  // Save violations to sessionStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "fullscreen_violations",
        JSON.stringify(fullscreenViolations),
      );
    }
  }, [fullscreenViolations]);

  useEffect(() => {
    const prevent = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const keyHandler = (e: KeyboardEvent) => {
      // Block Ctrl/Cmd + C, V, X, A (copy, paste, cut, select all)
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "c" ||
          e.key === "v" ||
          e.key === "x" ||
          e.key === "a" ||
          e.key === "C" ||
          e.key === "V" ||
          e.key === "X" ||
          e.key === "A")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block F12 and other dev tools shortcuts
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          (e.key === "I" ||
            e.key === "i" ||
            e.key === "J" ||
            e.key === "j" ||
            e.key === "C" ||
            e.key === "c"))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const FullScreenChangeHandler = () => {
      if (!document.fullscreenElement && isFullscreen) {
        // User exited fullscreen, show warning
        const violation = {
          timestamp: Date.now(),
          message: `Fullscreen exited at ${new Date().toLocaleTimeString()}`,
        };

        // Log to console
        console.log("🚨 FULLSCREEN VIOLATION DETECTED:", violation);
        console.log(
          "Total violations so far:",
          violationsRef.current.length + 1,
        );

        // Add to violations array
        setFullscreenViolations((prev) => [...prev, violation]);
        setShowWarning(true);
      } else if (document.fullscreenElement) {
        setIsFullscreen(true);
        setShowWarning(false);
      }
    };

    // Detect tab/window switching, screen switching, and minimize events
    const handleVisibilityChange = () => {
      if (document.hidden && isFullscreen) {
        const violation = {
          timestamp: Date.now(),
          message: `Tab/screen switched away at ${new Date().toLocaleTimeString()}`,
        };

        // Log to console
        console.log("🚨 TAB/SCREEN SWITCH VIOLATION DETECTED:", violation);
        console.log(
          "Total violations so far:",
          violationsRef.current.length + 1,
        );

        // Add to violations array
        setFullscreenViolations((prev) => [...prev, violation]);
        setShowWarning(true);
      }
    };

    // Detect window blur (losing focus)
    const handleWindowBlur = () => {
      if (isFullscreen) {
        const violation = {
          timestamp: Date.now(),
          message: `Window lost focus at ${new Date().toLocaleTimeString()}`,
        };

        // Log to console
        console.log("🚨 WINDOW BLUR VIOLATION DETECTED:", violation);
        console.log(
          "Total violations so far:",
          violationsRef.current.length + 1,
        );

        // Add to violations array
        setFullscreenViolations((prev) => [...prev, violation]);
        setShowWarning(true);
      }
    };

    if (isFullscreen) {
      document.addEventListener("copy", prevent, true);
      document.addEventListener("paste", prevent, true);
      document.addEventListener("cut", prevent, true);
      document.addEventListener("contextmenu", prevent, true);
      document.addEventListener("keydown", keyHandler, true);

      // Additional clipboard blocking
      document.addEventListener("beforecopy", prevent, true);
      document.addEventListener("beforecut", prevent, true);
      document.addEventListener("beforepaste", prevent, true);
    }

    document.addEventListener("fullscreenchange", FullScreenChangeHandler);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("copy", prevent, true);
      document.removeEventListener("paste", prevent, true);
      document.removeEventListener("cut", prevent, true);
      document.removeEventListener("contextmenu", prevent, true);
      document.removeEventListener("keydown", keyHandler, true);
      document.removeEventListener("beforecopy", prevent, true);
      document.removeEventListener("beforecut", prevent, true);
      document.removeEventListener("beforepaste", prevent, true);
      document.removeEventListener("fullscreenchange", FullScreenChangeHandler);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isFullscreen]);

  // Log violations whenever they change
  useEffect(() => {
    if (fullscreenViolations.length > 0) {
      console.log("📊 FULLSCREEN VIOLATIONS SUMMARY:");
      console.log("Total violations:", fullscreenViolations.length);
      console.table(fullscreenViolations);
    }
  }, [fullscreenViolations]);

  // Emit socket event when violations hit 5
  useEffect(() => {
    console.log("Socket ID (frontend):", socket?.id);

    if (fullscreenViolations.length === 5 && socket && isConnected) {
      console.log(
        "CRITICAL: 5 violations reached! Emitting global:violation event",
      );
      socket.emit("global:violation", {
        userId: userId,
        violations: fullscreenViolations,
        timestamp: Date.now(),
        totalCount: fullscreenViolations.length,
      });
      // Reset violations after emitting
      setFullscreenViolations([]);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("fullscreen_violations");
      }
    }
  }, [fullscreenViolations, socket]);

  // Reset violations when match ends
  useEffect(() => {
    if (!socket) return;

    const handleMatchEnd = () => {
      console.log("🔄 Match ended, resetting violations");
      setFullscreenViolations([]);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("fullscreen_violations");
      }
    };

    socket.on("round1:matchEnd", handleMatchEnd);

    return () => {
      socket.off("round1:matchEnd", handleMatchEnd);
    };
  }, [socket]);

  const enterFullScreen = async () => {
    // Check if already in fullscreen
    if (document.fullscreenElement) {
      // Already in fullscreen, just hide the warning
      setShowWarning(false);
      setIsFullscreen(true);
    } else {
      // Not in fullscreen, enter it
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        setShowWarning(false);
      } catch (err) {
        console.error("Failed to enter fullscreen:", err);
      }
    }
  };

  const blockEvent = (e: React.ClipboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className="h-screen w-screen select-none relative"
      onCopy={blockEvent}
      onPaste={blockEvent}
      onCut={blockEvent}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
      }}
    >
      {children}
      {showWarning && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="text-center p-8 bg-gray-900 rounded-lg border border-red-600 max-w-md">
            <h2 className="text-2xl font-bold text-red-500 mb-4">
              Exited Full Screen!
            </h2>
            <p className="text-gray-300 mb-4">
              You must remain in fullscreen mode during the challenge.
            </p>
            <div className="bg-red-900/30 border border-red-600 rounded p-3 mb-6">
              <p className="text-red-400 font-bold">
                Violations: {fullscreenViolations.length}
              </p>
            </div>
            <button
              onClick={enterFullScreen}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded transition-colors"
            >
              {document.fullscreenElement
                ? "Continue"
                : "Enter Fullscreen Mode"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
