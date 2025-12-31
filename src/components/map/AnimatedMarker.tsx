import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

interface AnimatedMarkerProps {
  map: mapboxgl.Map;
  lng: number;
  lat: number;
  status: 'moving' | 'idle' | 'stopped' | 'offline';
  heading?: number;
  isSelected?: boolean;
  engineOn?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

// Smooth interpolation between two points
export const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

// Easing function for smooth deceleration
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// Animate position smoothly
export function animatePosition(
  marker: mapboxgl.Marker,
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  duration: number = 1000,
  onComplete?: () => void
) {
  const startTime = performance.now();

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutCubic(progress);

    const currentLng = lerp(fromLng, toLng, easedProgress);
    const currentLat = lerp(fromLat, toLat, easedProgress);

    marker.setLngLat([currentLng, currentLat]);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      onComplete?.();
    }
  };

  requestAnimationFrame(animate);
}

// Create animated marker element
export function createAnimatedMarkerElement(
  status: 'moving' | 'idle' | 'stopped' | 'offline',
  isSelected: boolean = false,
  engineOn: boolean = false,
  heading: number = 0
): HTMLDivElement {
  const statusColors = {
    moving: 'hsl(142, 76%, 36%)', // green
    idle: 'hsl(38, 92%, 50%)', // amber
    stopped: 'hsl(220, 9%, 46%)', // gray
    offline: 'hsl(0, 84%, 60%)', // red
  };

  const color = statusColors[status];
  const el = document.createElement('div');
  el.className = 'animated-vehicle-marker';
  
  // Base styles with CSS animations
  el.style.cssText = `
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${color};
    border: ${isSelected ? '4px' : '2px'} solid ${isSelected ? 'white' : color};
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), 
                border-width 0.2s ease,
                box-shadow 0.3s ease;
    transform: rotate(${heading}deg);
    position: relative;
  `;

  // Inner content
  if (engineOn && status === 'moving') {
    el.innerHTML = `
      <span style="color: white; font-size: 14px; font-weight: bold;">▲</span>
    `;
  } else {
    el.innerHTML = `
      <div style="width: 10px; height: 10px; background: white; border-radius: 50%; opacity: 0.9;"></div>
    `;
  }

  // Add pulse ring for moving vehicles
  if (status === 'moving') {
    const pulseRing = document.createElement('div');
    pulseRing.className = 'marker-pulse-ring';
    pulseRing.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 2px solid ${color};
      animation: markerPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      pointer-events: none;
    `;
    el.appendChild(pulseRing);
  }

  // Hover effects
  el.addEventListener('mouseenter', () => {
    el.style.transform = `rotate(${heading}deg) scale(1.15)`;
    el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
  });

  el.addEventListener('mouseleave', () => {
    el.style.transform = `rotate(${heading}deg) scale(1)`;
    el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
  });

  return el;
}

// Create animated cluster element
export function createAnimatedClusterElement(
  pointCount: number,
  onClick?: () => void
): HTMLDivElement {
  const size = Math.min(56, 32 + Math.sqrt(pointCount) * 4);
  
  const el = document.createElement('div');
  el.className = 'animated-cluster-marker';
  
  el.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: linear-gradient(135deg, hsl(142, 76%, 36%), hsl(142, 76%, 26%));
    border: 3px solid rgba(255,255,255,0.9);
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: ${Math.max(13, size / 3)}px;
    cursor: pointer;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                box-shadow 0.3s ease;
    animation: clusterBounceIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  `;
  
  el.innerHTML = `${pointCount}`;

  // Hover effects
  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.1)';
    el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
  });

  el.addEventListener('mouseleave', () => {
    el.style.transform = 'scale(1)';
    el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
  });

  if (onClick) {
    el.addEventListener('click', onClick);
  }

  return el;
}

// Inject keyframes for marker animations (call once on mount)
export function injectMarkerAnimations() {
  if (document.getElementById('marker-animations-style')) return;

  const style = document.createElement('style');
  style.id = 'marker-animations-style';
  style.textContent = `
    @keyframes markerPulse {
      0% {
        transform: scale(1);
        opacity: 0.8;
      }
      50% {
        transform: scale(1.8);
        opacity: 0;
      }
      100% {
        transform: scale(1);
        opacity: 0;
      }
    }

    @keyframes clusterBounceIn {
      0% {
        transform: scale(0);
        opacity: 0;
      }
      50% {
        transform: scale(1.1);
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }

    @keyframes markerFadeIn {
      from {
        transform: scale(0.5);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    .animated-vehicle-marker {
      animation: markerFadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
  `;
  document.head.appendChild(style);
}

export default {
  lerp,
  easeOutCubic,
  animatePosition,
  createAnimatedMarkerElement,
  createAnimatedClusterElement,
  injectMarkerAnimations,
};
