"use client"

import { useEffect } from "react";

export default function SecureWrapper( {children, }:{children:React.ReactNode;}) {
    useEffect(() => {
        const prevent = (e:Event) => e.preventDefault();
        const keyHandler = (e:KeyboardEvent) => {
            if (
                e.ctrlKey || e.metaKey || e.key == "F12" || e.key == "Escape"
            ){
                e.preventDefault();
            }
        };


        const EnterFullScreen = async () => {
            if (!document.fullscreenElement){
                try{
                    await document.documentElement.requestFullscreen();
                } catch {}
            }
        };

        const FullScreenChangeHandler = () => {
            if (!document.fullscreenElement){
                EnterFullScreen();
            }
        };

        EnterFullScreen();

        document.addEventListener("copy", prevent);
        document.addEventListener("paste", prevent);
        document.addEventListener("cut", prevent);
        document.addEventListener("contextmenu", prevent);
        document.addEventListener("keydown", keyHandler);
        document.addEventListener("fullscreenchange", FullScreenChangeHandler);

        return () => {
            document.removeEventListener("copy", prevent);
            document.removeEventListener("paste", prevent);
            document.removeEventListener("cut", prevent);
            document.removeEventListener("contextmenu", prevent);
            document.removeEventListener("keydown", keyHandler);
            document.removeEventListener("fullscreenchange", FullScreenChangeHandler);
        };

    },[]);

    return (
    <div className="h-screen w-screen select-none">
      {children}
    </div>
  );
}