import React from 'react';
import './LoadingSpinner.css';

type LoadingSpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  className = '',
}) => (
  <span
    className={`loading-spinner loading-spinner--${size} ${className}`.trim()}
    role={label ? 'status' : 'presentation'}
    aria-label={label}
    aria-busy={Boolean(label)}
  >
    <svg className="loading-spinner__svg" viewBox="0 0 24 24" aria-hidden>
      <circle
        className="loading-spinner__track"
        cx="12"
        cy="12"
        r="10"
        fill="none"
        strokeWidth="3"
      />
      <circle
        className="loading-spinner__arc"
        cx="12"
        cy="12"
        r="10"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
    {label ? <span className="loading-spinner__label">{label}</span> : null}
  </span>
);

export default LoadingSpinner;
