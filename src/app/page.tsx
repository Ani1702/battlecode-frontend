import Hexagon  from "./components/hexagon";
import FlowingWaterHexagon from "./components/hexagon2";
import Navbar from "./components/navbar"
import AuthExample from "./components/AuthExample";

export default function Home() {
  return (
    
    <div className="font-orbitron flex flex-col items-center justify-center h-screen bg-black text-white">
      <Navbar></Navbar>
      <h1 className="text-9xl ">BATTLECODE</h1>
      <div className="text-white flex items-center justify-center p-4 text-5xl pt-10">LOGIN</div>
      <AuthExample />
      <Hexagon></Hexagon>
      
      
      
    </div>
  );
}
