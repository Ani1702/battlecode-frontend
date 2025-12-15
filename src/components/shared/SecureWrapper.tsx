"use client"

import { useEffect, useState } from "react";

export default function SecureWrapper( {children, }:{children:React.ReactNode;}) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showPrompt, setShowPrompt] = useState(true);
    const [showWarning, setShowWarning] = useState(false);

    useEffect(() => {
        const prevent = (e:Event) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };
        
        const keyHandler = (e:KeyboardEvent) => {
            // Block Ctrl/Cmd + C, V, X, A (copy, paste, cut, select all)
            if (
                (e.ctrlKey || e.metaKey) && 
                (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a' || 
                 e.key === 'C' || e.key === 'V' || e.key === 'X' || e.key === 'A')
            ){
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
            // Block F12 and other dev tools shortcuts
            if (
                e.key === "F12" || 
                ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'))
            ){
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        };

        const FullScreenChangeHandler = () => {
            if (!document.fullscreenElement && isFullscreen){
                // User exited fullscreen, show warning
                setShowWarning(true);
            } else if (document.fullscreenElement) {
                setIsFullscreen(true);
                setShowPrompt(false);
                setShowWarning(false);
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
        };

    },[isFullscreen]);

    const enterFullScreen = async () => {
        if (!document.fullscreenElement){
            try{
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
                setShowPrompt(false);
            } catch (err) {
                console.error("Failed to enter fullscreen:", err);
            }
        }
    };

    if (showPrompt) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-black/95">
                <div className="text-center p-8 bg-gray-900 rounded-lg border border-amber-600 max-w-md">
                    <h2 className="text-2xl font-bold text-white mb-4">Secure Mode Required</h2>
                    <p className="text-gray-300 mb-6">
                        This page requires fullscreen mode to prevent cheating. 
                        Click the button below to enter secure mode.
                    </p>
                    <button
                        onClick={enterFullScreen}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded transition-colors"
                    >
                        Enter Fullscreen Mode
                    </button>
                </div>
            </div>
        );
    }

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
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
        }}
    >
      {children}
      {showWarning && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
            <div className="text-center p-8 bg-gray-900 rounded-lg border border-red-600 max-w-md">
                <h2 className="text-2xl font-bold text-red-500 mb-4">⚠️ Fullscreen Exited</h2>
                <p className="text-gray-300 mb-6">
                    You must remain in fullscreen mode during the challenge.
                    Click below to re-enter fullscreen.
                </p>
                <button
                    onClick={enterFullScreen}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded transition-colors"
                >
                    Re-enter Fullscreen
                </button>
            </div>
        </div>
      )}
    </div>
  );
}