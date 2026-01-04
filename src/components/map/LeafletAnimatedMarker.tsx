import L from 'leaflet';

// Smooth interpolation between two points
export const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

// Easing function for smooth deceleration
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// Animate position smoothly for Leaflet markers
export function animateLeafletPosition(
  marker: L.Marker,
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

    marker.setLatLng([currentLat, currentLng]);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      onComplete?.();
    }
  };

  requestAnimationFrame(animate);
}

// Create animated marker icon for Leaflet
export function createLeafletMarkerIcon(
  status: 'moving' | 'idle' | 'stopped' | 'offline',
  isSelected: boolean = false,
  engineOn: boolean = false,
  heading: number = 0,
  isOverspeeding: boolean = false
): L.DivIcon {
  const statusColors = {
    moving: '#22c55e',
    idle: '#f59e0b',
    stopped: '#6b7280',
    offline: '#ef4444',
  };

  const color = isOverspeeding ? '#dc2626' : statusColors[status];
  const size = isSelected ? 32 : 28;

  const pulseAnimation = (status === 'moving' || isOverspeeding) 
    ? `<div class="leaflet-pulse-ring" style="
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        border-radius: 50%;
        border: ${isOverspeeding ? '2px' : '1px'} solid ${isOverspeeding ? '#dc2626' : color};
        animation: leafletMarkerPulse ${isOverspeeding ? '1s' : '2s'} ease-out infinite;
        pointer-events: none;
        opacity: ${isOverspeeding ? '0.8' : '0.6'};
      "></div>`
    : '';

  const innerContent = (engineOn && status === 'moving')
    ? `<svg width="12" height="12" viewBox="0 0 12 12" fill="white"><path d="M6 0L12 12H0L6 0Z"/></svg>`
    : `<div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>`;

  const html = `
    <div class="leaflet-animated-marker" style="
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
    ">
      ${innerContent}
      ${pulseAnimation}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'leaflet-div-icon-custom',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 5],
  });
}

// Create cluster icon for Leaflet
export function createLeafletClusterIcon(pointCount: number): L.DivIcon {
  const size = Math.min(48, 28 + Math.sqrt(pointCount) * 3);

  const html = `
    <div class="leaflet-cluster-marker" style="
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
      animation: leafletClusterBounceIn 0.3s ease-out;
    ">
      ${pointCount}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'leaflet-cluster-icon-custom',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Inject keyframes for Leaflet markers
export function injectLeafletMarkerAnimations() {
  if (document.getElementById('leaflet-marker-animations-style')) return;

  const style = document.createElement('style');
  style.id = 'leaflet-marker-animations-style';
  style.textContent = `
    @keyframes leafletMarkerPulse {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(2); opacity: 0; }
    }

    @keyframes leafletMarkerPulseFast {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(2.5); opacity: 0; }
    }

    @keyframes leafletClusterBounceIn {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .leaflet-div-icon-custom {
      background: transparent !important;
      border: none !important;
    }

    .leaflet-cluster-icon-custom {
      background: transparent !important;
      border: none !important;
    }

    .leaflet-animated-marker:hover {
      transform: scale(1.15) !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
    }

    .leaflet-cluster-marker:hover {
      transform: scale(1.1) !important;
      box-shadow: 0 4px 16px rgba(59, 130, 246, 0.5) !important;
    }

    /* Leaflet popup styles */
    .leaflet-popup-content-wrapper {
      padding: 0 !important;
      border-radius: 12px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
      overflow: hidden;
    }

    .leaflet-popup-content {
      margin: 0 !important;
      padding: 0 !important;
    }

    .leaflet-popup-tip {
      background: white !important;
    }

    .vehicle-popup-content {
      padding: 12px 14px;
      min-width: 280px;
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
  `;
  document.head.appendChild(style);
}

export default {
  lerp,
  easeOutCubic,
  animateLeafletPosition,
  createLeafletMarkerIcon,
  createLeafletClusterIcon,
  injectLeafletMarkerAnimations,
};
