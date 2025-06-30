interface ButtonProps {
  onClick?: () => void;
  content: string;
}

export default function Button({ onClick, content }: ButtonProps){
    return (
        <>
        <button 
            className="rounded-lg border p-4 h-12 text-white border-amber-600 font-oxanium w-30 justify-center items-center flex bg-black/40 backdrop-blur-sm hover:bg-amber-600 hover:text-black transition-colors duration-300 shadow-[0_0_20px_rgba(220,38,38,0.3)]"
            onClick={onClick}
        >
            {content}
        </button>
        </>
    );
}