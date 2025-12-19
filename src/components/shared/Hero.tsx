"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import {useSocket} from "@/contexts/SocketContext";

const Hero = () => {
  const router = useRouter();
  const { signInWithGoogle, user, isLoading } = useAuth();
  const [isExiting, setIsExiting] = useState(false);
  const {socket} = useSocket();
  const handleAuthClick = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    setIsExiting(true);
    setTimeout(() => {
      socket?.emit("client:join");
      router.push("/r1/rules");
    }, 1000);
  };

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter' && user) {
      setIsExiting(true);
      setTimeout(() => {

        router.push('/r1/rules');
      }, 1000); // Wait for animation to complete
    }
  }, [user, router]);

  useEffect(() => {
    // Add event listener for keydown
    window.addEventListener('keydown', handleKeyPress);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  return (
    <div className={`bg-[url(/Landingpage.svg)] bg-cover h-screen transform transition-transform duration-1000 overflow-x-hidden overflow-y-hidden ease-out ${
      isExiting ? '-translate-y-full' : 'translate-y-0'
    }`}>
      <div className="h-full z-1 orbitron text-white bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,0.17)_0%,rgba(0,0,0,0.57)_100%)]">
        <div className="hud">
          <div className="absolute topHUD left-0 top-50 lg:top-2 h-[6rem] w-full flex items-center justify-center">
            <div className="text-white h-full w-full bg-[url(/TopBar.svg)] bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6 tracking-wider">
              IEEE COMPUTER SOCIETY
              
            </div>
            <div className="text-white h-full w-full bg-[url(/TopBar.svg)] bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6 absolute blur-md tracking-wider">
              IEEE COMPUTER SOCIETY
              
            </div>
            <div className="text-white h-full w-full bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6 absolute blur-md tracking-wider">
              IEEE COMPUTER SOCIETY
              
              
            </div>
            
          </div>
          
          
          <div className="absolute leftHUD left-10 top-0 h-full w-[6rem] flex items-center justify-center">
            <div className="h-full w-full  lg:bg-[url(/LeftLine.svg)] bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6"></div>
            <div className="h-full w-full  sm:hidden lg:bg-[url(/LeftLine.svg)] bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6 absolute blur-md"></div>
          </div>
          <div className="absolute rightHUD right-10 top-0 h-full w-[6rem] flex items-center justify-center">
            <div className="h-full w-full  lg:bg-[url(/RightLine.svg)] bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6"></div>
            <div className="h-full w-full  lg:bg-[url(/RightLine.svg)] bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6 absolute blur-md"></div>
          </div>
          <div className="absolute bottomRight right-10 top-0 h-full w-[6rem] flex items-flex-end justify-center">
            <div className="h-full w-full   lg:bg-[url(/bottomRight.svg)] bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6"></div>
            <div className="h-full w-full  lg:bg-[url(/bottomRight.svg)] bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6 absolute blur-md"></div>
          </div>
        </div>

        <div className="containerContent flex flex-col items-center justify-center h-full ">
          <div className="flex items-center justify-center h-[20%]">
            <div className="z-1 absolute jusify-items items-center flex drop-shadow-[0_px_4px_#000]">
              <h1 className="text-4xl lg:text-8xl z-1 tracking-wide px-8 font-medium stickyMask text-shadow-heading">
                BATTLECODE
              </h1>
              <h1 className="text-5xl lg:text-8xl text-blur tracking-wide font-medium blur-sm absolute">
                BATTLECODE
              </h1>
            </div>
            <div className="flex absolute blur-3xl mix-blend-color-dodge">
              <h1 className="text-5xl lg:text-8xl z-1 tracking-wider font-medium stickyMask text-shadow-heading">
                BATTLECODE
              </h1>
              <h1 className="text-5xl lg:text-8xl text-blur tracking-wider font-medium blur-md absolute">
                BATTLECODE
              </h1>
            </div>
          </div>
          <div className = "relative mt-8">

          </div>

          <button
            onClick={handleAuthClick}
            disabled={isLoading}
            className="hidden lg:block relative gradient-border-button text-white uppercase tracking-wider hover:tracking-widest duration-[350ms] ease-out font-medium text-md mt-8"
          >
            {isLoading ? "LOADING..." : user ? "DASHBOARD" : "SIGN IN WITH GOOGLE"}
          </button>
        </div>

        <div className="w-[27rem] quote   flex relative bottom-50 lg:bottom-8 z-10 left-1/2 transform -translate-x-1/2 justify-center">
          <p className="z-1 text-center uppercase text-white tracking-[4px] absolute bottom-[5rem] text-[0.80rem] lg:text-[0.80rem] px-8 lg:px-0">
            This is more than just programming—it&apos;s precision under pressure.
            Enter the match with intent. Exit with impact.
          </p>
          <p className="text-center uppercase text-white tracking-[4px] absolute bottom-[5rem] blur-md text-[0.85rem]">
            This is more than just programming—it&apos;s precision under pressure.
            Enter the match with intent. Exit with impact.
          </p>
        </div>
        <div className = "sm:hidden justify-center text-white flex relative bottom-42 lg:bottom-8 z-10 left-1/2 transform -translate-x-1/2 text-center text-white text-sm lg:text-md font-medium ">
          Please Open on Laptop
        </div>
      </div>
    </div>
  );
};

export default Hero;
