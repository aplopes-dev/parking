import React from 'react';
import './Skeleton.css';

type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: boolean;
};

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
  rounded = false,
}) => (
  <span
    className={`skeleton${rounded ? ' skeleton--rounded' : ''} ${className}`.trim()}
    style={{ width, height }}
    aria-hidden
  />
);

export default Skeleton;
