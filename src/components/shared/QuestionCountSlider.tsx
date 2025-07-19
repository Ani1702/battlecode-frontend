"use client";
import { useState, useEffect } from "react";

interface QuestionCountSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export default function QuestionCountSlider({ value, onChange, className = "" }: QuestionCountSliderProps) {
  const allowedValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const [sliderValue, setSliderValue] = useState(() => {
    const index = allowedValues.indexOf(value);
    return index === -1 ? 0 : index; // Default to first value if not found
  });
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    const index = allowedValues.indexOf(value);
    setSliderValue(index === -1 ? 0 : index);
    setInputValue(value.toString());
  }, [value]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(e.target.value);
    setSliderValue(newIndex);
    const newValue = allowedValues[newIndex];
    setInputValue(newValue.toString());
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const numValue = parseInt(inputValue);
    
    if (isNaN(numValue)) {
      // Reset to current value if invalid
      setInputValue(value.toString());
      return;
    }

    // Clamp the value to allowed range
    const clampedValue = Math.max(1, Math.min(10, numValue));
    
    // Find the closest allowed value
    const closestValue = allowedValues.reduce((prev, curr) => 
      Math.abs(curr - clampedValue) < Math.abs(prev - clampedValue) ? curr : prev
    );

    setInputValue(closestValue.toString());
    const index = allowedValues.indexOf(closestValue);
    setSliderValue(index);
    onChange(closestValue);
  };

  const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      (e.target as HTMLInputElement).blur(); // Remove focus after Enter
    }
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex-1">
        <input
          type="range"
          min="0"
          max="9"
          value={sliderValue}
          onChange={handleSliderChange}
          className="w-full h-1 rounded-lg appearance-none cursor-pointer border-0"
          style={{
            background: 'linear-gradient(90deg, #F4B56F 0%, #F50000 100%)',
            transition: 'all 0.3s ease-in-out'
          }}
        />
      </div>
      <div className="bg-transparent border-2 border-red-500 rounded-lg px-4 py-2 min-w-[100px] w-[100px]">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyPress={handleInputKeyPress}
          className="font-bold text-lg text-center bg-transparent border-0 outline-none w-full text-transparent caret-red-500"
          style={{
            backgroundImage: 'linear-gradient(90deg, #F4B56F 0%, #F50000 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        />
        <div 
          className="text-xs text-center bg-clip-text text-transparent"
          style={{
            backgroundImage: 'linear-gradient(90deg, #F4B56F 0%, #F50000 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          questions
        </div>
      </div>
    </div>
  );
}
