"use client";
import React from "react";

interface HexagonalCardProps {
  children?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "primary" | "secondary" | "accent";
  onClick?: () => void;

  // Card type to render specific content
  cardType?: "player" | "stat" | "action";

  // Props for PlayerCard
  playerName?: string;
  avatar?: string;
  isReady?: boolean;
  rating?: number | string;

  // Props for StatCard and ActionCard
  title?: string;
  value?: string | number; // for StatCard
  icon?: React.ReactNode;
  description?: string; // for ActionCard
  disabled?: boolean; // for ActionCard
}

export default function HexagonalCard({
  children,
  className = "",
  size: initialSize = "md",
  variant: initialVariant = "primary",
  onClick,
  cardType,
  // player props
  playerName,
  avatar,
  isReady = false,
  rating,
  // stat/action props
  title,
  value,
  icon,
  description,
  disabled = false,
}: HexagonalCardProps) {
  // Size configurations
  const sizeClasses = {
    sm: "w-32 h-40",
    md: "w-48 h-64",
    lg: "w-64 h-80",
    xl: "w-80 h-96",
    "2xl": "w-96 h-[480px]",
  };

  // Variant configurations
  const variantClasses = {
    primary: "bg-gradient-to-br from-gray-800 to-gray-900",
    secondary: "bg-gradient-to-br from-blue-800 to-blue-900",
    accent: "bg-gradient-to-br from-orange-600 to-yellow-500",
  };

  let content = children;
  let size = initialSize;
  let variant = initialVariant;
  let finalOnClick = onClick;
  let finalClassName = `${className} font-oxanium`;

  if (cardType === 'player') {
    content = (
      <div className="flex flex-col h-full w-full items-center justify-center">
        <div className="flex-grow flex flex-col items-center justify-center p-4">
          <div className={`${size === '2xl' ? 'w-40 h-40' : size === 'xl' ? 'w-32 h-32' : size === 'lg' ? 'w-24 h-24' : 'w-16 h-16'} rounded-full bg-gray-600 border-2 border-red-500/80 mb-2 flex items-center justify-center transition-all`}>
            {avatar ? (
              <img src={avatar} alt={playerName} className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-200" />
            )}
          </div>
          <h3 className={`${size === '2xl' ? 'text-2xl' : size === 'xl' ? 'text-xl' : size === 'lg' ? 'text-lg' : 'text-base'} font-bold text-white mb-1 w-full truncate text-center transition-all`} title={playerName}>{playerName}</h3>
        </div>
        {rating !== undefined && (
          <div className="h-1/4 w-full flex items-center justify-center">
            <p className={`${size === '2xl' ? 'text-lg' : size === 'xl' ? 'text-base' : size === 'lg' ? 'text-sm' : 'text-xs'} text-white font-bold flex items-center transition-all`}>
              <span className="mr-1 text-yellow-300">⭐</span>
              {rating}
            </p>
          </div>
        )}
      </div>
    );
  } else if (cardType === 'stat') {
    variant = "secondary";
    size = "sm";
    content = (
      <>
        {icon && <div className="text-3xl mb-2">{icon}</div>}
        <h4 className="text-sm font-semibold text-gray-300 mb-1">{title}</h4>
        <p className="text-2xl font-bold text-white">{value}</p>
      </>
    );
  } else if (cardType === 'action') {
    variant = "accent";
    size = "md";
    finalOnClick = disabled ? undefined : onClick;
    finalClassName = `${finalClassName} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;
    content = (
      <>
        {icon && <div className="text-4xl mb-2">{icon}</div>}
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-gray-200">{description}</p>
        )}
      </>
    );
  }


  return (
    <div
      className={`
        relative 
        ${sizeClasses[size]} 
        cursor-pointer
        transition-all 
        duration-300 
        hover:scale-105 
        ${finalClassName}
        bg-contain bg-no-repeat bg-center
      `}
      style={{ backgroundImage: "url('/hexagon.svg')" }}
      onClick={finalOnClick}
    >
      {/* Inner content container */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
      >
        {content}
      </div>
    </div>
  );
}

// Pre-styled variants for common use cases
export function PlayerCard({
  playerName,
  avatar,
  rating,
  isReady = false,
  onClick,
  size = 'md',
}: {
  playerName: string;
  avatar?: string;
  rating?: number | string;
  isReady?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}) {
  return (
    <HexagonalCard
      cardType="player"
      playerName={playerName}
      avatar={avatar}
      rating={rating}
      isReady={isReady}
      onClick={onClick}
      size={size}
    />
  );
}

export function StatCard({
  title,
  value,
  icon,
  onClick,
}: {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <HexagonalCard cardType="stat" title={title} value={value} icon={icon} onClick={onClick} />
  );
}

export function ActionCard({
  title,
  description,
  icon,
  disabled,
  onClick,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <HexagonalCard
      cardType="action"
      title={title}
      description={description}
      icon={icon}
      disabled={disabled}
      onClick={onClick}
    />
  );
}
