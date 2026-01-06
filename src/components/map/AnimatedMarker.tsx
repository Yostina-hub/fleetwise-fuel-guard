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

// Smoother easing for GPS updates (handles network jitter)
export const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// Get speed-based color (green → yellow → red)
export function getSpeedColor(speed: number, maxSpeed: number = 120): string {
  const ratio = Math.min(speed / maxSpeed, 1);
  if (ratio < 0.5) {
    // Green to Yellow
    const g = Math.round(255 * (1 - ratio * 0.5));
    return `rgb(${Math.round(ratio * 2 * 255)}, ${g}, 50)`;
  } else {
    // Yellow to Red
    const g = Math.round(255 * (1 - (ratio - 0.5) * 2));
    return `rgb(255, ${g}, 50)`;
  }
}

// Animate position smoothly with improved easing for GPS updates
export function animatePosition(
  marker: mapboxgl.Marker,
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  duration: number = 1000,
  onComplete?: () => void
) {
  // Validate all coordinates before animating
  if (!isFinite(fromLng) || !isFinite(fromLat) || !isFinite(toLng) || !isFinite(toLat)) {
    console.warn('Invalid coordinates for animation, skipping', { fromLng, fromLat, toLng, toLat });
    onComplete?.();
    return () => {};
  }

  const startTime = performance.now();
  let animationFrame: number;

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Use smoother easing for GPS updates
    const easedProgress = easeInOutQuad(progress);

    const currentLng = lerp(fromLng, toLng, easedProgress);
    const currentLat = lerp(fromLat, toLat, easedProgress);

    // Only set position if values are valid
    if (isFinite(currentLng) && isFinite(currentLat)) {
      marker.setLngLat([currentLng, currentLat]);
    }

    if (progress < 1) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      onComplete?.();
    }
  };

  animationFrame = requestAnimationFrame(animate);
  
  // Return cancel function
  return () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
  };
}

// Create animated marker element - Modern, minimal design with live speed indicator
export function createAnimatedMarkerElement(
  status: 'moving' | 'idle' | 'stopped' | 'offline',
  isSelected: boolean = false,
  engineOn: boolean = false,
  heading: number = 0,
  isOverspeeding: boolean = false,
  speed?: number
): HTMLDivElement {
  const statusColors = {
    moving: '#22c55e', // success green
    idle: '#f59e0b', // warning amber
    stopped: '#6b7280', // gray
    offline: '#ef4444', // red
  };

  // Overspeeding uses a distinct red color
  const color = isOverspeeding ? '#dc2626' : statusColors[status];
  const size = isSelected ? 36 : 30;
  const el = document.createElement('div');
  el.className = 'animated-vehicle-marker';
  
  // Clean, modern marker style with improved shadow
  el.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: ${color};
    border: 2.5px solid white;
    box-shadow: 0 2px 10px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    transform: rotate(${heading}deg)${isSelected ? ' scale(1.15)' : ''};
    position: relative;
  `;

  // Direction arrow for moving vehicles, center dot for others
  if (status === 'moving' && engineOn) {
    // Larger, more prominent direction arrow pointing up (vehicle heading)
    el.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
        <path d="M12 2L4 20h4l4-8 4 8h4L12 2z"/>
      </svg>
    `;
  } else if (status === 'idle' && engineOn) {
    // Idle with engine on - show smaller arrow
    el.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white" style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2)); opacity: 0.8;">
        <path d="M12 2L4 20h4l4-8 4 8h4L12 2z"/>
      </svg>
    `;
  } else {
    el.innerHTML = `<div style="width: 8px; height: 8px; background: white; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>`;
  }

  // Speed badge for moving vehicles
  if (status === 'moving' && speed !== undefined && speed > 0) {
    const speedBadge = document.createElement('div');
    const badgeColor = isOverspeeding ? '#dc2626' : '#1f2937';
    speedBadge.className = 'speed-badge';
    speedBadge.style.cssText = `
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%) rotate(-${heading}deg);
      background: ${badgeColor};
      color: white;
      font-size: 9px;
      font-weight: 600;
      padding: 1px 4px;
      border-radius: 6px;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      pointer-events: none;
      z-index: 1;
    `;
    speedBadge.textContent = `${Math.round(speed)}`;
    el.appendChild(speedBadge);
  }

  // Pulse animation for moving or overspeeding vehicles
  if (status === 'moving' || isOverspeeding) {
    const pulseRing = document.createElement('div');
    const pulseColor = isOverspeeding ? '#dc2626' : color;
    const animationName = isOverspeeding ? 'markerPulseFast' : 'markerPulse';
    pulseRing.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: ${isOverspeeding ? '2.5px' : '1.5px'} solid ${pulseColor};
      animation: ${animationName} ${isOverspeeding ? '0.8s' : '1.8s'} ease-out infinite;
      pointer-events: none;
      opacity: ${isOverspeeding ? '0.9' : '0.7'};
    `;
    el.appendChild(pulseRing);
  }

  // Hover effects
  el.addEventListener('mouseenter', () => {
    el.style.transform = `rotate(${heading}deg) scale(1.2)`;
    el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.45)';
  });

  el.addEventListener('mouseleave', () => {
    el.style.transform = `rotate(${heading}deg)${isSelected ? ' scale(1.15)' : ''}`;
    el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.3)';
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
  easeInOutQuad,
  getSpeedColor,
  animatePosition,
  createAnimatedMarkerElement,
  createAnimatedClusterElement,
  injectMarkerAnimations,
};
