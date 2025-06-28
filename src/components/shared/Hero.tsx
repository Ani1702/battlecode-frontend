"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const Hero = () => {
  const router = useRouter();
  const { signInWithGoogle, user, isLoading } = useAuth();

  const handleAuthClick = async () => {
    if (user) {
      router.push("/dashboard");
    } else {
      await signInWithGoogle();
    }
  };

  return (
    <div className="bg-[url(/Landingpage.svg)] bg-cover h-screen">
      <div className="h-full z-1 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,0.17)_0%,rgba(0,0,0,0.57)_100%)]">
        <div className="hud">
          <div className="absolute topHUD left-0 top-2 h-[6rem] w-full flex items-center justify-center">
            <div className="h-full w-full bg-[url(/TopBar.svg)] bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6 tracking-wider">
              IEEE COMPUTER SOCIETY
            </div>
            <div className="h-full w-full bg-[url(/TopBar.svg)] bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6 absolute blur-md tracking-wider">
              IEEE COMPUTER SOCIETY
            </div>
            <div className="h-full w-full bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6 absolute blur-md tracking-wider">
              IEEE COMPUTER SOCIETY
            </div>
          </div>
          <div className="absolute leftHUD left-10 top-0 h-full w-[6rem] flex items-center justify-center">
            <div className="h-full w-full bg-[url(/LeftLine.svg)] bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6"></div>
            <div className="h-full w-full bg-[url(/LeftLine.svg)] bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6 absolute blur-md"></div>
          </div>
          <div className="absolute rightHUD right-10 top-0 h-full w-[6rem] flex items-center justify-center">
            <div className="h-full w-full bg-[url(/RightLine.svg)] bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6"></div>
            <div className="h-full w-full bg-[url(/RightLine.svg)] bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6 absolute blur-md"></div>
          </div>
          <div className="absolute bottomRight right-10 bottom-[-320] h-full w-[6rem] flex items-flex-end justify-center">
            <div className="h-full w-full bg-[url(/bottomRight.svg)] bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6"></div>
            <div className="h-full w-full bg-[url(/bottomRight.svg)] bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6 absolute blur-md"></div>
          </div>
        </div>

        <div className="containerContent flex flex-col items-center justify-center h-full">
          <div className="flex items-center justify-center h-[20%]">
            <div className="z-1 absolute flex drop-shadow-[0_px_4px_#000]">
              <h1 className="text-8xl z-1 tracking-wide font-medium stickyMask text-shadow-heading">
                BATTLECODE
              </h1>
              <h1 className="text-8xl text-blur tracking-wide font-medium blur-sm absolute">
                BATTLECODE
              </h1>
            </div>
            <div className="flex absolute blur-3xl mix-blend-color-dodge">
              <h1 className="text-8xl z-1 tracking-wider font-medium stickyMask text-shadow-heading">
                BATTLECODE
              </h1>
              <h1 className="text-8xl text-blur tracking-wider font-medium blur-md absolute">
                BATTLECODE
              </h1>
            </div>
          </div>

          <button
            onClick={handleAuthClick}
            disabled={isLoading}
            className="relative gradient-border-button text-white uppercase tracking-wider hover:tracking-widest duration-[350ms] ease-out font-medium text-md mt-8"
          >
            {isLoading ? "LOADING..." : user ? "DASHBOARD" : "REGISTER"}
          </button>
        </div>

        <div className="w-[458px] quote flex relative bottom-[-8px] z-10 left-1/2 transform -translate-x-1/2 justify-center">
          <p className="z-1 text-center uppercase tracking-[4px] absolute bottom-[5rem] text-[0.85rem]">
            This is more than just programming—it's precision under pressure.
            Enter the match with intent. Exit with impact.
          </p>
          <p className="text-center uppercase tracking-[4px] absolute bottom-[5rem] blur-md text-[0.85rem]">
            This is more than just programming—it's precision under pressure.
            Enter the match with intent. Exit with impact.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Hero;
