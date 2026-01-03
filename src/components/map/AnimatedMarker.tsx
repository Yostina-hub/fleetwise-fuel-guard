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

// Create animated marker element - Modern, minimal design
export function createAnimatedMarkerElement(
  status: 'moving' | 'idle' | 'stopped' | 'offline',
  isSelected: boolean = false,
  engineOn: boolean = false,
  heading: number = 0,
  isOverspeeding: boolean = false
): HTMLDivElement {
  const statusColors = {
    moving: '#22c55e', // success green
    idle: '#f59e0b', // warning amber
    stopped: '#6b7280', // gray
    offline: '#ef4444', // red
  };

  // Overspeeding uses a distinct red color
  const color = isOverspeeding ? '#dc2626' : statusColors[status];
  const size = isSelected ? 32 : 28;
  const el = document.createElement('div');
  el.className = 'animated-vehicle-marker';
  
  // Clean, modern marker style
  el.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: ${color};
    border: 2px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    transform: rotate(${heading}deg)${isSelected ? ' scale(1.1)' : ''};
    position: relative;
  `;

  // Simple direction arrow for moving vehicles
  if (engineOn && status === 'moving') {
    el.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="white"><path d="M6 0L12 12H0L6 0Z"/></svg>`;
  } else {
    el.innerHTML = `<div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>`;
  }

  // Pulse for moving or overspeeding vehicles
  if (status === 'moving' || isOverspeeding) {
    const pulseRing = document.createElement('div');
    const pulseColor = isOverspeeding ? '#dc2626' : color;
    const animationName = isOverspeeding ? 'markerPulseFast' : 'markerPulse';
    pulseRing.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: ${isOverspeeding ? '2px' : '1px'} solid ${pulseColor};
      animation: ${animationName} ${isOverspeeding ? '1s' : '2s'} ease-out infinite;
      pointer-events: none;
      opacity: ${isOverspeeding ? '0.8' : '0.6'};
    `;
    el.appendChild(pulseRing);
  }

  // Hover effects
  el.addEventListener('mouseenter', () => {
    el.style.transform = `rotate(${heading}deg) scale(1.15)`;
    el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)';
  });

  el.addEventListener('mouseleave', () => {
    el.style.transform = `rotate(${heading}deg)${isSelected ? ' scale(1.1)' : ''}`;
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  });

  return el;
}

// Create animated cluster element - Modern, minimal design
export function createAnimatedClusterElement(
  pointCount: number,
  onClick?: () => void
): HTMLDivElement {
  const size = Math.min(48, 28 + Math.sqrt(pointCount) * 3);
  
  const el = document.createElement('div');
  el.className = 'animated-cluster-marker';
  
  el.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    border: 2px solid white;
    box-shadow: 0 2px 10px rgba(59, 130, 246, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: ${Math.max(11, size / 3.5)}px;
    cursor: pointer;
    transition: all 0.2s ease;
    animation: clusterBounceIn 0.3s ease-out;
  `;
  
  el.innerHTML = `${pointCount}`;

  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.1)';
    el.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.5)';
  });

  el.addEventListener('mouseleave', () => {
    el.style.transform = 'scale(1)';
    el.style.boxShadow = '0 2px 10px rgba(59, 130, 246, 0.4)';
  });

  if (onClick) {
    el.addEventListener('click', onClick);
  }

  return el;
}

// Inject keyframes and popup styles
export function injectMarkerAnimations() {
  if (document.getElementById('marker-animations-style')) return;

  const style = document.createElement('style');
  style.id = 'marker-animations-style';
  style.textContent = `
    @keyframes markerPulse {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(2); opacity: 0; }
    }

    @keyframes markerPulseFast {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(2.5); opacity: 0; }
    }

    @keyframes clusterBounceIn {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .animated-vehicle-marker {
      animation: markerFadeIn 0.2s ease-out;
    }

    @keyframes markerFadeIn {
      from { transform: scale(0.8); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    /* Modern popup styles */
    .mapboxgl-popup-content {
      padding: 0 !important;
      border-radius: 12px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
      overflow: hidden;
    }

    .mapboxgl-popup-tip {
      border-top-color: white !important;
    }

    .vehicle-popup-content {
      padding: 12px 14px;
      min-width: 140px;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 10px;
    }

    .popup-plate {
      font-weight: 600;
      font-size: 14px;
      color: #1a1a1a;
    }

    .popup-status {
      font-size: 10px;
      font-weight: 500;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: capitalize;
    }

    .popup-status-moving { background: #dcfce7; color: #166534; }
    .popup-status-idle { background: #fef3c7; color: #92400e; }
    .popup-status-stopped { background: #f3f4f6; color: #4b5563; }
    .popup-status-offline { background: #fee2e2; color: #991b1b; }

    .popup-stats {
      display: flex;
      gap: 16px;
      padding: 8px 0;
      border-top: 1px solid #f0f0f0;
    }

    .popup-stat {
      display: flex;
      flex-direction: column;
    }

    .popup-stat-value {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .popup-stat-label {
      font-size: 10px;
      color: #6b7280;
    }

    .popup-address {
      font-size: 11px;
      color: #6b7280;
      padding-top: 8px;
      border-top: 1px solid #f0f0f0;
      line-height: 1.3;
    }

    .popup-overspeeding {
      background: #fee2e2;
      color: #991b1b;
      font-size: 11px;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 4px;
      margin: 8px 0;
    }

    .popup-driver {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #374151;
      padding: 6px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .popup-driver-icon {
      font-size: 11px;
    }

    .popup-driver-phone {
      font-size: 10px;
      color: #6b7280;
    }

    .popup-no-driver {
      color: #9ca3af;
      font-style: italic;
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
