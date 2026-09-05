import React from 'react'
import logoPng from '../../assets/logo.png'

interface BodhiLogoProps {
  size?: number | string
  className?: string
  color?: string
  alt?: string
  glow?: boolean
}

export const BodhiLogo: React.FC<BodhiLogoProps> = ({
  size = 20,
  className = '',
  color,
  alt = 'BODHI',
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
        backgroundColor: color || 'var(--bodhi-accent, #5DD62C)',
        maskImage: `url(${logoPng})`,
        WebkitMaskImage: `url(${logoPng})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        filter: glow
          ? 'drop-shadow(0 0 10px var(--bodhi-accent-glow, rgba(93, 214, 44, 0.35)))'
          : undefined,
        transition: 'background-color 0.25s ease, filter 0.25s ease'
      }}
      className={`inline-block select-none shrink-0 ${className}`}
    />
  )
}
