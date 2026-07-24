"use client";
import { useRouter } from "next/navigation";

const Hero = () => {
  const router = useRouter();

  return (
    <div className="fixed inset-0 overflow-hidden overscroll-none bg-[url(/Landingpage.webp)] bg-cover bg-center">
      <div className="relative h-full z-1 orbitron text-white bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,0.17)_0%,rgba(0,0,0,0.57)_100%)]">
        <p className="absolute left-0 right-0 top-6 z-20 text-center text-sm tracking-wider sm:top-8 sm:text-base lg:top-10">
          IEEE COMPUTER SOCIETY
        </p>

        <div className="relative z-20 flex h-full min-h-0 flex-col items-center justify-center px-6 sm:px-8">
          <div className="flex w-full max-w-lg flex-col items-center gap-8 sm:gap-12 lg:gap-16">
            <div className="relative flex w-full items-center justify-center">
              <div className="z-1 relative flex items-center drop-shadow-[0_4px_4px_#000]">
                <h1 className="stickyMask text-shadow-heading z-1 px-2 text-[2.35rem] font-medium tracking-wide sm:text-[2.75rem] lg:text-7xl">
                  BATTLECODE
                </h1>
                <h1 className="text-blur absolute text-[2.35rem] font-medium tracking-wide blur-sm sm:text-[2.75rem] lg:text-7xl">
                  BATTLECODE
                </h1>
              </div>
              <div className="absolute flex blur-3xl mix-blend-color-dodge">
                <h1 className="stickyMask text-shadow-heading z-1 text-[2.35rem] font-medium tracking-wider sm:text-[2.75rem] lg:text-7xl">
                  BATTLECODE
                </h1>
                <h1 className="text-blur absolute text-[2.35rem] font-medium tracking-wider blur-md sm:text-[2.75rem] lg:text-7xl">
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

          <div className="absolute bottom-[max(2.75rem,calc(env(safe-area-inset-bottom)+1.75rem))] left-1/2 w-full max-w-md -translate-x-1/2 px-6 sm:px-8 lg:bottom-12 lg:max-w-lg lg:px-0">
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
