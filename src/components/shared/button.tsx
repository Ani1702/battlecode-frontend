interface ButtonProps {
  onClick?: () => void;
  content: string;
}

export default function Button({ onClick, content }: ButtonProps){
    return (
        <>
        <button 
            className="rounded-lg border text-white border-amber-600 font-oxanium text-2xl w-30"
            onClick={onClick}
        >
            {content}
        </button>
        </>
    );
}