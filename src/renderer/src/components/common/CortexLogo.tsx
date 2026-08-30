import React from 'react'
import logoPng from '../../assets/logo.png'

interface CortexLogoProps {
  size?: number | string
  className?: string
  color?: string
  alt?: string
  glow?: boolean
}

export const CortexLogo: React.FC<CortexLogoProps> = ({
  size = 20,
  className = '',
  color,
  alt = 'Cortex',
  glow = true
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size

  return (
    <div
      role="img"
      aria-label={alt}
      style={{
        width: pixelSize,
        height: pixelSize,
        backgroundColor: color || 'var(--cortex-accent, #5DD62C)',
        maskImage: `url(${logoPng})`,
        WebkitMaskImage: `url(${logoPng})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        filter: glow
          ? 'drop-shadow(0 0 10px var(--cortex-accent-glow, rgba(93, 214, 44, 0.35)))'
          : undefined,
        transition: 'background-color 0.25s ease, filter 0.25s ease'
      }}
      className={`inline-block select-none shrink-0 ${className}`}
    />
  )
}
