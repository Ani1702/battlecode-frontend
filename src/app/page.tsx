
import { AuthPage } from "./authentication";
import { GoogleAuthPage } from "./authentication";

export default function Home() {
  return (
    <div className="font-orbitron flex flex-col items-center justify-center h-screen bg-black text-white">
      <h1 className="text-9xl ">BATTLECODE</h1>
      <div className="text-white flex items-center justify-center p-4 text-5xl pt-10">LOGIN</div>
      <AuthPage></AuthPage>
      <GoogleAuthPage></GoogleAuthPage>
      
      
    </div>
  );
}
