interface ColoredBtnProps {
  onClick?: () => void;
  content: string;
}

export default function ColoredBtn({ onClick, content }: ColoredBtnProps){
    return (
        <>
        <button 
            className="rounded-lg border border-amber-600 bg-amber-600 font-oxanium text-2xl w-full h-fit py-2 px-4"
            onClick={onClick}
        >
            {content}
        </button>
        </>
    );
}
