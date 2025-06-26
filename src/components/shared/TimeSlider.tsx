"use client";
import { useState, useEffect } from "react";

interface TimeSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export default function TimeSlider({ value, onChange, className = "" }: TimeSliderProps) {
  const allowedValues = [15, 30, 45, 60, 75, 90];
  const [sliderValue, setSliderValue] = useState(allowedValues.indexOf(value));

  useEffect(() => {
    setSliderValue(allowedValues.indexOf(value));
  }, [value]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(e.target.value);
    setSliderValue(newIndex);
    onChange(allowedValues[newIndex]);
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex-1">
        <input
          type="range"
          min="0"
          max="5"
          value={sliderValue}
          onChange={handleSliderChange}
          className="w-full h-1 rounded-lg appearance-none cursor-pointer border-0"
          style={{
            background: 'linear-gradient(to right, #fbbf24, #f59e0b, #dc2626)',
            transition: 'all 0.3s ease-in-out'
          }}
        />
      </div>
      <div className="bg-white rounded-lg px-4 py-2 min-w-[80px]">
        <div className="text-black font-bold text-lg text-center">
          {value}
        </div>
        <div className="text-gray-600 text-xs text-center">
          minutes
        </div>
      </div>
    </div>
  );
}
