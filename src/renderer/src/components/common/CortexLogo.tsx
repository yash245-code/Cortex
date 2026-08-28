import React from 'react'
import logoPng from '../../assets/logo.png'

interface CortexLogoProps {
  size?: number | string
  className?: string
  alt?: string
}

export const CortexLogo: React.FC<CortexLogoProps> = ({
  size = 20,
  className = '',
  alt = 'Cortex'
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size

  return (
    <img
      src={logoPng}
      alt={alt}
      width={typeof size === 'number' ? size : undefined}
      height={typeof size === 'number' ? size : undefined}
      style={{ width: pixelSize, height: pixelSize }}
      className={`object-contain select-none pointer-events-none ${className}`}
      draggable={false}
    />
  )
}
