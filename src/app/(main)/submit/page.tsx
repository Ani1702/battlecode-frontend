'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Square {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
}


export default function Submit(){
    const [squares, setSquares] = useState<Square[]>([]);
    const [countdown, setCountdown] = useState(100);
    const router = useRouter();
    useEffect(() => {
        // Initialize squares
        const initialSquares: Square[] = Array.from({ length: 25 }, (_, i) => ({
            id: i,
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: Math.random() * 8 + 6
        }));
        setSquares(initialSquares);

        // Animation loop
        const animate = () => {
            setSquares(prevSquares => 
                prevSquares.map(square => {
                    let newX = square.x + square.vx;
                    let newY = square.y + square.vy;
                    let newVx = square.vx;
                    let newVy = square.vy;

                    // Bounce off walls
                    if (newX <= 0 || newX >= window.innerWidth - square.size) {
                        newVx = -newVx;
                        newX = Math.max(0, Math.min(newX, window.innerWidth - square.size));
                    }
                    if (newY <= 0 || newY >= window.innerHeight - square.size) {
                        newVy = -newVy;
                        newY = Math.max(0, Math.min(newY, window.innerHeight - square.size));
                    }

                    return {
                        ...square,
                        x: newX,
                        y: newY,
                        vx: newVx,
                        vy: newVy
                    };
                })
            );
        };

        const interval = setInterval(animate, 16);
        return () => clearInterval(interval);
    }, []);

    // Countdown timer effect
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            // Redirect to dashboard when countdown reaches 0
            router.push('/dashboard');
        }
    }, [countdown, router]);

    return (
        <>
        <div className = "h-screen bg-black bg-cover bg-center flex justify-center items-center relative overflow-hidden">
            {squares
                .filter(square => {
                    // Calculate white box boundaries (centered, 50% width, 60% height)
                    const boxWidth = window.innerWidth * 0.5;
                    const boxHeight = window.innerHeight * 0.6;
                    const boxLeft = (window.innerWidth - boxWidth) / 2;
                    const boxTop = (window.innerHeight - boxHeight) / 2;
                    const boxRight = boxLeft + boxWidth;
                    const boxBottom = boxTop + boxHeight;
                    
                    // Check if any part of the square overlaps with the white box
                    const squareRight = square.x + square.size;
                    const squareBottom = square.y + square.size;
                    
                    // Square disappears as soon as any edge touches the box
                    const isOverlapping = !(square.x >= boxRight || 
                                           squareRight <= boxLeft || 
                                           square.y >= boxBottom || 
                                           squareBottom <= boxTop);
                    
                    return !isOverlapping;
                })
                .map(square => (
                <div
                    key={square.id}
                    className="absolute bg-orange-500 opacity-70"
                    style={{
                        left: `${square.x}px`,
                        top: `${square.y}px`,
                        width: `${square.size}px`,
                        height: `${square.size}px`,
                        transition: 'none'
                    }}
                />
            ))}
            <div className = "h-[60%] w-[50%] flex justify-center items-center border-2 border-white flex-col relative z-10">
                <Image src="/submit_logo.svg" alt="Submit Logo" className="flex-3 h-20" width={80} height={80}/>
                <div className = "text-center flex-[0.5]">
                    <p className = "text-orange-500 text-2xl orbitron">SUBMITION RECIEVED!</p>
                    <p className = "text-white text-sm flex justify-center">Thank you for participating...</p>
                    <p className = "text-white text-sm flex justify-center">Redirecting to Dashboard in {countdown}...</p>
                </div>
                
            </div>
        </div>
        </>
    );
}