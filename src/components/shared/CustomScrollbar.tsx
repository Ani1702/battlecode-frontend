import React from 'react';

interface CustomScrollbarProps {
  children: React.ReactNode;
  className?: string;
}

export default function CustomScrollbar({ children, className = "" }: CustomScrollbarProps) {
  return (
    <>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #f97316, #ea580c);
          border-radius: 6px;
          border: 1px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #fb923c, #f97316);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #f97316 rgba(0, 0, 0, 0.1);
        }
      `}</style>
      <div className={`custom-scrollbar ${className}`}>
        {children}
      </div>
    </>
  );
}
