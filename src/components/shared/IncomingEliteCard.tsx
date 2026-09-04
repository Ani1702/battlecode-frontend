import Image from "next/image";

interface IncomingEliteCardProps {
  username: string;
  onAccept: () => void;
  onDeny: () => void;
}

export default function IncomingEliteCard({
  username,
  onAccept,
  onDeny,
}: IncomingEliteCardProps) {
  return (
    <div className="relative w-full h-[100px] mb-4 hover:scale-105 cursor-pointer group transition-all duration-300">
      <div
        className="absolute inset-0 w-full z-0 h-full bg-contain bg-no-repeat bg-center"
        style={{
          backgroundImage: "url('/player_card.svg')",
          backgroundSize: "100% 100%",
        }}
      />

      <div className="absolute left-[200px] top-1/2 transform -translate-y-1/2 z-10">
        <p className="text-white font-bold text-sm tracking-wider orbitron uppercase group-hover:text-orange-200 transition-colors duration-300 drop-shadow-lg">
          {username}
        </p>
      </div>

      <div className="absolute gap-2 right-[100px] top-1/2 transform -translate-y-1/2 z-10 flex flex-row">
        <button
          onClick={onAccept}
          className="w-8 h-8 relative bottom-[5px] bg-green-500 hover:bg-green-600 rounded-sm flex items-center justify-center transition-colors duration-200 group-hover:scale-110"
          title="Accept Challenge"
        >
          <Image src="/tick_2.png" alt="Accept" width={16} height={16} />
        </button>
        <button
          onClick={onDeny}
          className="w-8 h-8 bg-red-500 hover:bg-red-600 bottom-[5px] rounded-sm relative flex items-center justify-center transition-colors duration-200 group-hover:scale-110"
          title="Deny Challenge"
        >
          <span className="text-white font-bold text-sm leading-none">×</span>
        </button>
      </div>
    </div>
  );
}
