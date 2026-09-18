import type React from 'react';
import { type Card as CardType, SUIT_SYMBOLS, SUIT_COLORS } from '../types';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  isPlayable?: boolean;
  isTrump?: boolean;
  isKnownByComputer?: boolean;
  onClick?: () => void;
  faceDown?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const CardComponent: React.FC<CardProps> = ({
  card,
  isSelected = false,
  isPlayable = false,
  isTrump = false,
  isKnownByComputer = false,
  onClick,
  faceDown = false,
  className = '',
  style = {},
}) => {
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const suitColor = SUIT_COLORS[card.suit];

  if (faceDown) {
    return (
      <div
        className={`relative w-16 rounded-lg shadow-md 
          bg-gradient-to-br from-blue-700 to-blue-900 border-2 border-blue-500
          flex items-center justify-center transition-all duration-200 ${className}`}
        style={{
          ...style,
          aspectRatio: '2.5/3.5',
        }}
      >
        <div className="absolute inset-1 rounded border border-blue-400 opacity-50" />
        <div className="text-blue-300 text-2xl font-bold opacity-60">🃏</div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative w-16 rounded-lg shadow-md 
        bg-white border-2 transition-all duration-200 cursor-pointer
        select-none flex flex-col items-center justify-between p-1
        ${isSelected ? 'border-yellow-400 -translate-y-3 shadow-yellow-200 shadow-lg scale-105 z-50' : 'hover:z-40'}
        ${isPlayable && !isSelected && isTrump ? 'border-purple-400 hover:-translate-y-2 hover:shadow-lg shadow-purple-200' : ''}
        ${isPlayable && !isSelected && !isTrump ? 'border-green-400 hover:-translate-y-2 hover:shadow-lg' : ''}
        ${!isSelected && !isPlayable ? 'border-gray-200 hover:border-gray-300' : ''}
        ${onClick ? 'active:scale-95' : ''}
        animate-card-appear ${className}`}
      style={{
        ...style,
        aspectRatio: '2.5/3.5',
      }}
    >
      {isKnownByComputer && !isSelected && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-sm bg-red-500 rounded-full w-5 h-5 flex items-center justify-center shadow-lg z-10">
          👁️
        </div>
      )}
      <div className="self-start text-left" style={{ color: suitColor }}>
        <div className="text-xs font-bold leading-tight">{card.rank}</div>
        <div className="text-xs leading-tight">{suitSymbol}</div>
      </div>
      <div className="text-2xl" style={{ color: suitColor }}>
        {suitSymbol}
      </div>
      <div className="self-end text-right rotate-180" style={{ color: suitColor }}>
        <div className="text-xs font-bold leading-tight">{card.rank}</div>
        <div className="text-xs leading-tight">{suitSymbol}</div>
      </div>
    </div>
  );
};

export const CardPlaceholder: React.FC<{ label?: string }> = ({ label }) => (
  <div
    className="w-16 rounded-lg border-2 border-dashed border-gray-400 opacity-30
      flex items-center justify-center"
    style={{ aspectRatio: '2.5/3.5' }}
  >
    {label && <span className="text-gray-400 text-xs">{label}</span>}
  </div>
);
