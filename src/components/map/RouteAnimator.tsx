import mapboxgl from 'mapbox-gl';

interface RouteAnimatorOptions {
  map: mapboxgl.Map;
  coordinates: [number, number][];
  sourceId: string;
  layerId: string;
  color?: string;
  width?: number;
  duration?: number;
  onComplete?: () => void;
}

/**
 * Animates a route polyline being drawn on the map
 */
export class RouteAnimator {
  private map: mapboxgl.Map;
  private coordinates: [number, number][];
  private sourceId: string;
  private layerId: string;
  private color: string;
  private width: number;
  private duration: number;
  private onComplete?: () => void;
  private animationId: number | null = null;
  private isAnimating: boolean = false;

  constructor(options: RouteAnimatorOptions) {
    this.map = options.map;
    this.coordinates = options.coordinates;
    this.sourceId = options.sourceId;
    this.layerId = options.layerId;
    this.color = options.color || '#22c55e';
    this.width = options.width || 4;
    this.duration = options.duration || 2000;
    this.onComplete = options.onComplete;
  }

  private setupSource() {
    // Remove existing source/layer if they exist
    if (this.map.getLayer(this.layerId)) {
      this.map.removeLayer(this.layerId);
    }
    if (this.map.getSource(this.sourceId)) {
      this.map.removeSource(this.sourceId);
    }

    // Add empty source
    this.map.addSource(this.sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      },
    });

    // Add line layer with glow effect
    this.map.addLayer({
      id: `${this.layerId}-glow`,
      type: 'line',
      source: this.sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': this.color,
        'line-width': this.width + 6,
        'line-opacity': 0.3,
        'line-blur': 4,
      },
    });

    // Main line layer
    this.map.addLayer({
      id: this.layerId,
      type: 'line',
      source: this.sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': this.color,
        'line-width': this.width,
        'line-opacity': 1,
      },
    });
  }

  private updateRoute(progress: number) {
    const numPoints = Math.max(2, Math.floor(this.coordinates.length * progress));
    const visibleCoordinates = this.coordinates.slice(0, numPoints);

    // If we're between points, interpolate the last segment
    if (progress < 1 && numPoints < this.coordinates.length) {
      const segmentProgress = (this.coordinates.length * progress) % 1;
      const lastIndex = numPoints - 1;
      const nextIndex = numPoints;

      if (nextIndex < this.coordinates.length) {
        const [x1, y1] = this.coordinates[lastIndex];
        const [x2, y2] = this.coordinates[nextIndex];
        const interpolatedPoint: [number, number] = [
          x1 + (x2 - x1) * segmentProgress,
          y1 + (y2 - y1) * segmentProgress,
        ];
        visibleCoordinates.push(interpolatedPoint);
      }
    }

    const source = this.map.getSource(this.sourceId) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: visibleCoordinates,
        },
      });
    }
  }

  public start() {
    if (this.coordinates.length < 2) return;

    this.setupSource();
    this.isAnimating = true;

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      if (!this.isAnimating) return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.duration, 1);

      // Use easeOutQuart for smooth deceleration
      const easedProgress = 1 - Math.pow(1 - progress, 4);
      this.updateRoute(easedProgress);

      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.onComplete?.();
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }

  public stop() {
    this.isAnimating = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public cleanup() {
    this.stop();
    if (this.map.getLayer(`${this.layerId}-glow`)) {
      this.map.removeLayer(`${this.layerId}-glow`);
    }
    if (this.map.getLayer(this.layerId)) {
      this.map.removeLayer(this.layerId);
    }
    if (this.map.getSource(this.sourceId)) {
      this.map.removeSource(this.sourceId);
    }
  }
}

/**
 * Hook-friendly function to animate a route
 */
export function animateRoute(
  map: mapboxgl.Map,
  coordinates: [number, number][],
  options?: {
    id?: string;
    color?: string;
    width?: number;
    duration?: number;
  }
): RouteAnimator {
  const id = options?.id || `route-${Date.now()}`;
  
  const animator = new RouteAnimator({
    map,
    coordinates,
    sourceId: `${id}-source`,
    layerId: `${id}-layer`,
    color: options?.color,
    width: options?.width,
    duration: options?.duration,
  });

  animator.start();
  return animator;
}

export default RouteAnimator;
