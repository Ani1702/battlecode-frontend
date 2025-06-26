import About from "../comps/About";
import Hero from "../comps/Hero";
import Image from "next/image";
export default function Home() {
  return (
    <main>
      <Hero className="-z-[10] relative" />
      <div className="gradientSmoothen h-[14rem] bg-[linear-gradient(181deg,_rgba(12,12,12,0)_5.49%,_rgba(9,9,9,0.6)_20.02%,_#070607_48.66%,_rgba(7,6,7,0)_97.17%)] absolute bottom-[-8rem] w-full z-[10]  "></div>
      <About className=" relative -z-[10]" />
      <div className="bg-[url(/Ellipse.svg)] absolute bottom-[-22rem] h-[750px] opacity-55 w-full bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6 z-[10] "></div>
    </main>
  );
}
