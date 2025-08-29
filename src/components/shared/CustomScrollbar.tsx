"use client"
import { useRef, useEffect, useState } from "react";
import React from "react";

interface CustomScrollbarProps {
  children: React.ReactNode;
  className?: string;
}

// A vertical stick scrollbar that is orange and moves with scroll
export default function CustomScrollbar({ children, className = "" }: CustomScrollbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [thumbTop, setThumbTop] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(40); // px

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function updateThumb() {
      if (!container) return;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const ratio = clientHeight / scrollHeight;
      setThumbHeight(Math.max(40, clientHeight * ratio));
      setThumbTop((scrollTop / (scrollHeight - clientHeight)) * (clientHeight - thumbHeight) || 0);
    }
    updateThumb();
    container.addEventListener("scroll", updateThumb);
    window.addEventListener("resize", updateThumb);
    return () => {
      container.removeEventListener("scroll", updateThumb);
      window.removeEventListener("resize", updateThumb);
    };
  }, [thumbHeight]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div
        ref={containerRef}
        className="overflow-y-auto w-full h-full pr-4 scrollbar-hide overflow-x-hidden"
        style={{
          // Hide native scrollbar for all browsers
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        <div style={{ minWidth: "100%", maxWidth: "calc(100% - 16px)", boxSizing: "border-box", paddingRight: 16 }}>
          {children}
        </div>
      </div>
      {/* Custom vertical stick */}
      <div className="absolute top-0 right-1 w-2 h-full pointer-events-none flex items-start">
        <div
          style={{
            top: thumbTop,
            height: thumbHeight,
            background: "#fb923c",
            borderRadius: "8px",
            position: "absolute",
            width: "6px",
            transition: "top 0.1s",
            boxShadow: "0 0 4px #fb923c99",
          }}
        />
      </div>
    </div>
  );
}
