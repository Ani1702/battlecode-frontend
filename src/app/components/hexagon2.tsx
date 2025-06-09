'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const MotionPath = motion.path;

export default function FlowingWaterHexagon() {
  const waterTop = 100;
  const waterBottom = 200;

  function generateSineWavePath(phase = 0) {
    const width = 200;
    const amplitude = 10;
    const frequency = (2 * Math.PI) / 100;
    const points = [];

    for (let x = 0; x <= width; x += 5) {
      const y = waterTop + amplitude * Math.sin(frequency * (x + phase));
      points.push([x, y]);
    }

    let path = `M0,${waterBottom} L0,${points[0][1]}`;
    for (let i = 0; i < points.length; i++) {
      path += ` L${points[i][0]},${points[i][1]}`;
    }
    path += ` L${width},${waterBottom} Z`;
    return path;
  }

  const [phase, setPhase] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let animationFrame: number;

    const animate = () => {
      if (isHovered) {
        setPhase((prev) => (prev + 1) % 100); // slower increment for slower animation
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [isHovered]);

  return (
    <svg
      viewBox="0 0 200 200"
      className="w-64 h-64"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      <defs>
        <clipPath id="hexClip">
          <path d="M100,10 L170,50 L170,130 L100,170 L30,130 L30,50 Z" />
        </clipPath>
      </defs>

      <path
        d="M100,10 L170,50 L170,130 L100,170 L30,130 L30,50 Z"
        fill="none"
        stroke="red"
        strokeWidth="5"
      />

      <g clipPath="url(#hexClip)">
        <MotionPath
          d={generateSineWavePath(phase)}
          fill="red"
          stroke="#800000"
          strokeWidth="3"
          style={{ pointerEvents: 'none' }}
        />
      </g>
    </svg>
  );
}
