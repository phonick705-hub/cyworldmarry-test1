import React from 'react';

interface AcornIconProps {
  className?: string;
}

export const AcornIcon: React.FC<AcornIconProps> = ({
  className = 'w-4 h-4 inline-block shrink-0 align-middle',
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="도토리"
      className={className}
    >
      {/* Stem */}
      <path
        d="M12 2.5C12.3 1.7 13.3 1.4 14.2 1.8C14.7 2.0 14.9 2.7 14.5 3.1C14.1 3.5 13.6 3.5 13.4 4.3"
        stroke="#3B2F2F"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.3 3.9L12.7 2.6"
        stroke="#7A4B2A"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Acorn Nut Body */}
      <path
        d="M5.6 10.5C5.3 15.6 8.0 19.8 12.0 21.8C16.0 19.8 18.7 15.6 18.4 10.5H5.6Z"
        fill="#D6944E"
        stroke="#3B2F2F"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      {/* Nut Shading (Right/Bottom) */}
      <path
        d="M15.6 11.2C15.8 15.0 14.3 18.3 12.0 20.6C14.9 19.0 17.5 15.5 17.4 11.2H15.6Z"
        fill="#B67231"
      />

      {/* Nut Highlight (Left) */}
      <path
        d="M7.6 12.4C7.6 14.7 8.4 16.7 9.7 18.1"
        stroke="#F5CE93"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Acorn Cap */}
      <path
        d="M4.2 9.4C4.2 6.0 7.7 4.0 12.0 4.0C16.3 4.0 19.8 6.0 19.8 9.4C19.8 10.5 18.9 11.2 17.6 11.2H6.4C5.1 11.2 4.2 10.5 4.2 9.4Z"
        fill="#734729"
        stroke="#3B2F2F"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      {/* Cap Texture Dots / Crosshatch */}
      <circle cx="8.2" cy="7.4" r="0.85" fill="#9A643F" />
      <circle cx="12.0" cy="6.6" r="0.85" fill="#9A643F" />
      <circle cx="15.8" cy="7.4" r="0.85" fill="#9A643F" />
      <circle cx="10.0" cy="9.1" r="0.85" fill="#9A643F" />
      <circle cx="14.0" cy="9.1" r="0.85" fill="#9A643F" />

      {/* Cap Rim Highlight */}
      <path
        d="M6.4 10.1H17.6"
        stroke="#57341C"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
};
