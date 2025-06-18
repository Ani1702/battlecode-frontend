import svg from "@/public/Landingpage.svg";
import Image from "next/image";
export default function Home() {
  return (
    <>
      <div className="bg-[url(@/public/Landingpage.svg)] bg-cover h-screen">
        <div className="h-full z-1 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,0.17)_0%,rgba(0,0,0,0.57)_100%)]">
          <div className="hud h-full z-1">
            <div className="flex justify-center items-center h-screen ">
              <div className="containerHeading absolute flex h-full top-0 justify-center items-center">
                <div className="z-1 absolute flex drop-shadow-[0_px_4px_#000]">
                  <h1 className="text-8xl z-1 tracking-wide font-medium stickyMask text-shadow-heading">
                    BATTLECODE
                  </h1>
                  <h1 className="text-8xl text-blur tracking-wide font-medium blur-sm absolute">
                    BATTLECODE
                  </h1>
                </div>
                <div className="absolute flex  blur-3xl mix-blend-color-dodge">
                  <h1 className="text-8xl z-1 tracking-wider font-medium stickyMask text-shadow-heading">
                    BATTLECODE
                  </h1>
                  <h1 className="text-8xl text-blur tracking-wider font-medium blur-md absolute">
                    BATTLECODE
                  </h1>
                </div>
              </div>
              <div className="w-[458px] quote flex absolute bottom-0  justify-center">
                <p className="z-1  text-center uppercase tracking-[4px] absolute bottom-[5rem] text-[0.85rem]">
                  This is more than just programming—it's precision under
                  pressure. Enter the match with intent. Exit with impact.
                </p>
                <p className="text-center uppercase tracking-[4px] absolute bottom-[5rem] blur-md text-[0.85rem]">
                  This is more than just programming—it's precision under
                  pressure. Enter the match with intent. Exit with impact.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
