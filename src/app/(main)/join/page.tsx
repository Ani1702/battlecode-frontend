"use client"
import { useRef, useState } from "react";
import Button from "@/components/shared/button";

export default function Join(){
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [code, setCode] = useState(['', '', '', '', '', '']);

    const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        
        // Update the code array
        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);
        
        // If a character is typed and it's not the last input, move to next
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const getCompleteCode = () => {
        return code.join('');
    };

    return(
        <div className = "bg-black flex flex-col h-full">
            <div className = "flex-1 flex items-end justify-center">
                ENTER CODE
            </div>
            <div className = "flex-1 flex justify-center items-center gap-2">
                <input 
                    ref={(el) => { inputRefs.current[0] = el; }}
                    className="rounded-md h-10 w-10 bg-gray-400 text-center text-lg font-semibold" 
                    maxLength={1} 
                    value={code[0]}
                    onChange={(e) => handleInputChange(0, e)}
                />
                <input 
                    ref={(el) => { inputRefs.current[1] = el; }}
                    className="rounded-md h-10 w-10 bg-gray-400 text-center text-lg font-semibold" 
                    maxLength={1} 
                    value={code[1]}
                    onChange={(e) => handleInputChange(1, e)}
                />
                <input 
                    ref={(el) => { inputRefs.current[2] = el; }}
                    className="rounded-md h-10 w-10 bg-gray-400 text-center text-lg font-semibold" 
                    maxLength={1} 
                    value={code[2]}
                    onChange={(e) => handleInputChange(2, e)}
                />
                <input 
                    ref={(el) => { inputRefs.current[3] = el; }}
                    className="rounded-md h-10 w-10 bg-gray-400 text-center text-lg font-semibold" 
                    maxLength={1} 
                    value={code[3]}
                    onChange={(e) => handleInputChange(3, e)}
                />
                <input 
                    ref={(el) => { inputRefs.current[4] = el; }}
                    className="rounded-md h-10 w-10 bg-gray-400 text-center text-lg font-semibold" 
                    maxLength={1} 
                    value={code[4]}
                    onChange={(e) => handleInputChange(4, e)}
                />
                <input 
                    ref={(el) => { inputRefs.current[5] = el; }}
                    className="rounded-md h-10 w-10 bg-gray-400 text-center text-lg font-semibold" 
                    maxLength={1} 
                    value={code[5]}
                    onChange={(e) => handleInputChange(5, e)}
                />
            </div>
            <div className = "flex-1 flex justify-center items-start">
                <Button content = "Join Game" onClick={() => console.log("Complete code:", getCompleteCode())} />
            </div>

        </div>
    );
}