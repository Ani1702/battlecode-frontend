"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { useSocket } from "@/contexts/SocketContext";

const Hero = () => {
  const router = useRouter();
  const { signInWithGoogle, signOut, user, isLoading } = useAuth();
  const [isExiting, setIsExiting] = useState(false);
  const { socket } = useSocket();
  const handleAuthClick = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    setIsExiting(true);
    setTimeout(() => {
      socket?.emit("client:join");
      router.push("/dashboard");
    }, 1000);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Enter" && user) {
        setIsExiting(true);
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000); // Wait for animation to complete
      }
    },
    [user, router],
  );

  useEffect(() => {
    // Add event listener for keydown
    window.addEventListener("keydown", handleKeyPress);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  return (
    <div
      className={`bg-[url(/Landingpage.svg)] bg-cover h-screen transform transition-transform duration-1000 overflow-x-hidden overflow-y-hidden ease-out ${
        isExiting ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="h-full z-1 orbitron text-white bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,0.17)_0%,rgba(0,0,0,0.57)_100%)]">
        {/* Logout button in top right */}
        {user && (
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="group flex items-center justify-start w-11 h-11 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full cursor-pointer relative overflow-hidden transition-all duration-200 shadow-lg hover:w-32 hover:rounded-lg hover:bg-white/20 active:translate-x-1 active:translate-y-1"
            >
              <div className="flex items-center justify-center w-full transition-all duration-300 group-hover:justify-start group-hover:px-3">
                <svg className="w-4 h-4" viewBox="0 0 512 512" fill="white">
                  <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path>
                </svg>
              </div>
              <div className="absolute orbitron right-5 transform translate-x-full opacity-0 text-white text-lg font-semibold transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                Logout
              </div>
            </button>
          </div>
        )}

        <div className="hud">
          <div className="absolute topHUD left-0 top-2 h-[4rem] w-full flex items-center justify-center sm:h-[5rem] lg:h-[6rem]">
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
            <div className="h-full w-full    bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6"></div>
            <div className="h-full w-full   bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6 absolute blur-md"></div>
          </div>
        </div>

        <div className="containerContent flex h-full flex-col items-center justify-between px-6 pb-10 pt-24 sm:px-8 lg:justify-center lg:pb-0 lg:pt-0">
          <div className="flex w-full max-w-lg flex-col items-center gap-5 lg:gap-6">
            <div className="relative flex w-full items-center justify-center">
              <div className="z-1 relative flex items-center drop-shadow-[0_4px_4px_#000]">
                <h1 className="stickyMask text-shadow-heading z-1 px-2 text-[2.75rem] font-medium tracking-wide sm:text-5xl lg:text-8xl">
                  BATTLECODE
                </h1>
                <h1 className="text-blur absolute text-[2.75rem] font-medium tracking-wide blur-sm sm:text-5xl lg:text-8xl">
                  BATTLECODE
                </h1>
              </div>
              <div className="absolute flex blur-3xl mix-blend-color-dodge">
                <h1 className="stickyMask text-shadow-heading z-1 text-[2.75rem] font-medium tracking-wider sm:text-5xl lg:text-8xl">
                  BATTLECODE
                </h1>
                <h1 className="text-blur absolute text-[2.75rem] font-medium tracking-wider blur-md sm:text-5xl lg:text-8xl">
                  BATTLECODE
                </h1>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <span className="stickyMask text-shadow-heading flex items-center gap-[0.05em] text-xl font-medium uppercase sm:text-2xl lg:text-[2.75rem]">
                .Powered&nbsp;by&nbsp;Judge
              </span>

              <svg
                opacity={0.7}
                viewBox="0 0 60 90"
                xmlns="http://www.w3.org/2000/svg"
                className="judge-zero inline-block h-[1.25rem] w-auto sm:h-[1.5rem] lg:h-[2.75rem]"
                aria-hidden
              >
                <defs>
                  <linearGradient
                    id="judgeZeroGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#FDBA74" />
                    <stop offset="55%" stopColor="#F97316" />
                    <stop offset="100%" stopColor="#C2410C" />
                  </linearGradient>

                  <mask id="judgeZeroNoise">
                    <rect width="100%" height="100%" fill="white" />
                    <image
                      href="/mask.svg"
                      width="140"
                      height="140"
                      preserveAspectRatio="xMidYMid slice"
                      opacity="0.55"
                    />
                  </mask>
                </defs>

                {/* outer zero – slimmer */}
                <rect
                  x="14"
                  y="4"
                  width="32"
                  height="82"
                  rx="10"
                  fill="url(#judgeZeroGradient)"
                  mask="url(#judgeZeroNoise)"
                />

                {/* inner cutout */}
                <rect
                  x="19"
                  y="12"
                  width="22"
                  height="66"
                  rx="7"
                  fill="black"
                />

                {/* center dot */}
                <circle
                  cx="30"
                  cy="45"
                  r="4"
                  fill="url(#judgeZeroGradient)"
                  mask="url(#judgeZeroNoise)"
                />
              </svg>
            </div>

            <button
              onClick={() => router.push("/simulations")}
              className="gradient-border-button relative mt-1 px-8 py-3 text-sm font-medium uppercase tracking-wider text-white duration-[350ms] ease-out hover:tracking-widest lg:text-md"
            >
              Play Minigame
            </button>
          </div>

          <div className="relative w-full max-w-md px-2 lg:absolute lg:bottom-8 lg:left-1/2 lg:max-w-lg lg:-translate-x-1/2 lg:px-0">
            <p className="text-shadow-heading text-center text-[0.65rem] uppercase leading-relaxed tracking-[2px] text-white sm:text-[0.7rem] sm:tracking-[3px] lg:text-[0.8rem] lg:tracking-[4px]">
              This is more than just programming—it&apos;s precision under
              pressure. Enter the match with intent. Exit with impact.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
