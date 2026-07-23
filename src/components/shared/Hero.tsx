"use client";
import { useRouter } from "next/navigation";

const Hero = () => {
  const router = useRouter();

  return (
    <div className="bg-[url(/Landingpage.webp)] bg-cover h-screen overflow-x-hidden overflow-y-hidden">
      <div className="h-full z-1 orbitron text-white bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,0.17)_0%,rgba(0,0,0,0.57)_100%)]">
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
          <div className="flex w-full max-w-lg flex-col items-center gap-10 sm:gap-12 lg:gap-16">
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

            <button
              onClick={() => router.push("/simulations")}
              className="gradient-border-button relative px-8 py-3 text-sm font-medium uppercase tracking-wider text-white duration-[350ms] ease-out hover:tracking-widest lg:text-md"
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
