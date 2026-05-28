import React from 'react';

type SmartPosTableIconProps = {
  className?: string;
};

const SmartPosTableIcon: React.FC<SmartPosTableIconProps> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <ellipse
      cx="32"
      cy="14"
      rx="22"
      ry="8"
      stroke="currentColor"
      strokeWidth="2.5"
      fill="currentColor"
      fillOpacity="0.12"
    />
    <path
      d="M14 22v22M50 22v22"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <ellipse
      cx="32"
      cy="48"
      rx="18"
      ry="6"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      fillOpacity="0.08"
    />
    <circle cx="32" cy="14" r="3" fill="currentColor" fillOpacity="0.35" />
  </svg>
);

export default SmartPosTableIcon;
