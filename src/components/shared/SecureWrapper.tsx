"use client";

import { useEffect, useState, useRef } from "react";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import { showErrorToast } from "@/components/shared/CustomToast";

type Violation = { timestamp: number; message: string };

// Minimum time (ms) between two DISTINCT violations before we count a new
// one. Prevents a single real event (e.g. tab switch) from firing multiple
// browser events (blur + visibilitychange + fullscreenchange) and being
// counted 2-3x for what is really one action.
const VIOLATION_DEDUPE_WINDOW_MS = 2000;

export default function SecureWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { socket, isConnected } = useSocket();
  const { userId } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [fullscreenViolations, setFullscreenViolations] = useState<Violation[]>(() => {
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

  const violationsRef = useRef<Violation[]>([]);
  const lastToastRef = useRef(0);
  const lastViolationTimeRef = useRef(0);

  // Mirrors isFullscreen but read inside listeners via ref, so a stale
  // closure never blocks a handler from seeing the current value.
  const isFullscreenRef = useRef(false);

  useEffect(() => {
    violationsRef.current = fullscreenViolations;
  }, [fullscreenViolations]);

  useEffect(() => {
    isFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "fullscreen_violations",
        JSON.stringify(fullscreenViolations),
      );
    }
  }, [fullscreenViolations]);

  // --- Single source of truth for registering a violation, with dedupe ---
  const registerViolation = (reason: string) => {
    const now = Date.now();

    if (now - lastViolationTimeRef.current < VIOLATION_DEDUPE_WINDOW_MS) {
      console.log(
        `⏭️ Skipped duplicate violation ("${reason}") within dedupe window`,
      );
      return;
    }

    lastViolationTimeRef.current = now;

    const violation = {
      timestamp: now,
      message: `${reason} at ${new Date(now).toLocaleTimeString()}`,
    };

    console.log("🚨 VIOLATION DETECTED:", violation);
    console.log("Total violations so far:", violationsRef.current.length + 1);

    setFullscreenViolations((prev) => [...prev, violation]);
    setShowWarning(true);
  };

  useEffect(() => {
    const prevent = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      if (now - lastToastRef.current > 10000) {
        showErrorToast("Copy/Paste is disabled");
        lastToastRef.current = now;
      }

      return false;
    };

    const keyHandler = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "v", "x", "a"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        e.stopPropagation();
        const now = Date.now();
        if (now - lastToastRef.current > 10000) {
          showErrorToast("Copy/Paste is disabled");
          lastToastRef.current = now;
        }
        return false;
      }

      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          ["i", "j", "c"].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Fullscreen exit itself is always a violation, regardless of prior state.
    const fullScreenChangeHandler = () => {
      if (!document.fullscreenElement && isFullscreenRef.current) {
        setIsFullscreen(false);
        registerViolation("Fullscreen exited");
      } else if (document.fullscreenElement) {
        setIsFullscreen(true);
        setShowWarning(false);
      }
    };

    // FIX (#12): tab/window switching is a violation whether the person is
    // currently in fullscreen OR has already exited it. Previously this was
    // gated on isFullscreenRef.current, which meant a single fullscreen exit
    // let someone tab-switch freely afterward with no further penalty. Now
    // it only stops counting once the challenge itself is inactive (i.e.
    // SecureWrapper unmounts), not just because they left fullscreen.
    const handleVisibilityChange = () => {
      if (!document.hidden) return;
      if (isFullscreenRef.current) {
        registerViolation("Tab/screen switched away");
      } else {
        registerViolation("Tab/screen switched away while outside fullscreen");
      }
    };

    const handleWindowBlur = () => {
      if (isFullscreenRef.current) {
        registerViolation("Window lost focus");
      } else {
        registerViolation("Window lost focus while outside fullscreen");
      }
    };

    // Copy/paste/devtools blocking still only makes sense while fullscreen
    // is the "active" enforced state — these are UX guards, not violation
    // triggers, so they stay gated as before.
    if (isFullscreen) {
      document.addEventListener("copy", prevent, true);
      document.addEventListener("paste", prevent, true);
      document.addEventListener("cut", prevent, true);
      document.addEventListener("contextmenu", prevent, true);
      document.addEventListener("keydown", keyHandler, true);
      document.addEventListener("beforecopy", prevent, true);
      document.addEventListener("beforecut", prevent, true);
      document.addEventListener("beforepaste", prevent, true);
    }

    // These listeners are always active — not conditioned on isFullscreen —
    // so violation detection keeps working after a fullscreen exit.
    document.addEventListener("fullscreenchange", fullScreenChangeHandler);
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
      document.removeEventListener(
        "fullscreenchange",
        fullScreenChangeHandler,
      );
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      window.removeEventListener("blur", handleWindowBlur);
    };
    // isFullscreen still drives whether copy/paste blocking is attached,
    // so it stays in the dependency array; violation checks inside the
    // handlers now read the ref instead, so they're unaffected by re-runs.
  }, [isFullscreen]);

  useEffect(() => {
    if (fullscreenViolations.length > 0) {
      console.log("📊 VIOLATIONS SUMMARY:");
      console.log("Total violations:", fullscreenViolations.length);
      console.table(fullscreenViolations);
    }
  }, [fullscreenViolations]);

  // Emit socket event when violations hit 5.
  // NOTE: the reset-to-0 here is explicitly for local testing convenience —
  // see PR description. Actual disqualification must happen server-side on
  // receipt of "global:violation"; this reset does not undo that.
  useEffect(() => {
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
      setFullscreenViolations([]);
      lastViolationTimeRef.current = 0;
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("fullscreen_violations");
      }
    }
  }, [fullscreenViolations, socket, isConnected, userId]);

  // Reset violations when a match/round ends — covers every round's own
  // event names.
  useEffect(() => {
    if (!socket) return;

    const handleMatchEnd = () => {
      console.log("🔄 Match/round ended, resetting violations");
      setFullscreenViolations([]);
      lastViolationTimeRef.current = 0;
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("fullscreen_violations");
      }
    };

    socket.on("round0:ended", handleMatchEnd);
    socket.on("round1:matchEnd", handleMatchEnd);
    socket.on("round1:ended", handleMatchEnd);
    socket.on("round2:matchResult", handleMatchEnd);
    socket.on("round2:bountyEnded", handleMatchEnd);
    socket.on("round2:ended", handleMatchEnd);
    socket.on("round3:ended", handleMatchEnd);

    return () => {
      socket.off("round0:ended", handleMatchEnd);
      socket.off("round1:matchEnd", handleMatchEnd);
      socket.off("round1:ended", handleMatchEnd);
      socket.off("round2:matchResult", handleMatchEnd);
      socket.off("round2:bountyEnded", handleMatchEnd);
      socket.off("round2:ended", handleMatchEnd);
      socket.off("round3:ended", handleMatchEnd);
    };
  }, [socket]);

  const enterFullScreen = async () => {
    if (document.fullscreenElement) {
      setShowWarning(false);
      setIsFullscreen(true);
      return;
    }
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setShowWarning(false);
    } catch (err) {
      console.error("Failed to enter fullscreen:", err);
    }
  };

  // Sync state to real browser fullscreen status on every mount, instead of
  // trusting stale defaults — makes the gate correct regardless of which
  // round the user is coming from.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      setIsFullscreen(false);
      setShowWarning(true);
    } else {
      setIsFullscreen(true);
      setShowWarning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              {document.fullscreenElement
                ? "Exited Full Screen!"
                : "Fullscreen Required"}
            </h2>
            <p className="text-gray-300 mb-4">
              You must remain in fullscreen mode during the challenge.
            </p>
            {fullscreenViolations.length > 0 && (
              <div className="bg-red-900/30 border border-red-600 rounded p-3 mb-6">
                <p className="text-red-400 font-bold">
                  Violations: {fullscreenViolations.length}
                </p>
              </div>
            )}
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