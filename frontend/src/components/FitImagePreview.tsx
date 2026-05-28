import React, { useCallback, useEffect, useState } from 'react';
import './FitImagePreview.css';

export type FitImagePreviewProps = {
  /** URL da imagem; sem src exibe placeholder */
  src?: string | null;
  alt: string;
  /** Substituto se a imagem falhar ao carregar */
  fallbackSrc?: string;
  /** Texto ou letra no placeholder vazio (ex.: inicial do produto) */
  placeholderContent?: React.ReactNode;
  className?: string;
  /** Largura do container (ex.: 96, '100%') */
  width?: number | string;
  /** Altura do container (ex.: 220, '100%') */
  height?: number | string;
  /** Modificadores de tamanho: sm | md | card | square */
  size?: 'sm' | 'md' | 'card' | 'square';
  rounded?: 'md' | 'lg';
  loading?: 'lazy' | 'eager';
};

/**
 * Preview de imagem que sempre preenche o container:
 * object-fit: cover + object-position: center (sem distorção).
 */
const FitImagePreview: React.FC<FitImagePreviewProps> = ({
  src,
  alt,
  fallbackSrc,
  placeholderContent,
  className = '',
  width,
  height,
  size,
  rounded = 'md',
  loading = 'lazy',
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    setFailedSrc(null);
  }, [src]);

  const handleError = useCallback(() => {
    if (src) setFailedSrc(src);
  }, [src]);

  const displaySrc =
    src && failedSrc !== src ? src : fallbackSrc && failedSrc ? fallbackSrc : null;

  const sizeClass = size ? ` fit-image-preview--size-${size}` : '';
  const roundedClass = ` fit-image-preview--rounded-${rounded}`;
  const containerClass =
    `fit-image-preview${sizeClass}${roundedClass} ${className}`.trim();

  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className={containerClass} style={Object.keys(style).length ? style : undefined}>
      {displaySrc ? (
        <img
          key={displaySrc}
          className="fit-image-preview__img"
          src={displaySrc}
          alt={alt}
          loading={loading}
          onError={handleError}
        />
      ) : (
        <div className="fit-image-preview__placeholder" aria-hidden={!alt}>
          {placeholderContent ?? <span className="fit-image-preview__placeholder-icon">🍽️</span>}
        </div>
      )}
    </div>
  );
};

export default FitImagePreview;
