"use client";
import { useEffect, useState } from "react";

// By declaring the 'opera' property on the global Window interface,
// TypeScript will recognize it without needing to use 'as any'.
declare global {
  interface Window {
    opera?: unknown;
  }
}

const MobileOnly = ({ children }: { children: React.ReactNode }) => {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    // Now we can access window.opera directly.
    // We also wrap `ua` in String() to safely handle any potential non-string values before calling toLowerCase().
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const mobileCheck = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      String(ua).toLowerCase()
    );
    setIsMobile(mobileCheck);
  }, []);

  if (isMobile === null) {
    return null; // Wait until the check is complete before rendering anything.
  }

  if (isMobile) {
    return (
      <div className="bg-[url(/Landingpage.svg)] bg-cover h-screen overflow-hidden">
        <div className="h-full orbitron text-white bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,0.17)_0%,rgba(0,0,0,0.57)_100%)] flex flex-col justify-between items-center">
          <div className="w-full text-center mt-8 tracking-wider text-sm">
            IEEE COMPUTER SOCIETY
          </div>
          <div className="flex flex-col items-center justify-center">
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
            <p className="mt-[30vh] px-8 text-center text-xs leading-relaxed uppercase">
              This is more than just programming — it&apos;s precision under
              pressure. Enter the match with intent. Exit with impact.
            </p>
          </div>
          <div className="mb-10 text-sm uppercase">Please Open on Laptop</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default MobileOnly;