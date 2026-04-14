import { useState, useEffect, useRef, useCallback } from "react";
import type { SimulationState } from "@/components/map/sumo/types";
import { createInitialState, stepSimulation } from "@/components/map/sumo/SumoSimulationEngine";

export function useSumoSimulation(active: boolean, vehicleCount = 120) {
  const [state, setState] = useState<SimulationState | null>(null);
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const lastTimeRef = useRef<number>(0);
  const stateRef = useRef<SimulationState | null>(null);

  // Init / teardown
  useEffect(() => {
    if (active) {
      const initial = createInitialState(vehicleCount);
      stateRef.current = initial;
      setState(initial);
      lastTimeRef.current = performance.now();
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      stateRef.current = null;
      setState(null);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, vehicleCount]);

  // Animation loop
  useEffect(() => {
    if (!active || !stateRef.current) return;

    let frameCount = 0;
    const loop = (now: number) => {
      const dtSeconds = Math.min((now - lastTimeRef.current) / 1000, 0.1); // cap at 100ms
      lastTimeRef.current = now;
      if (stateRef.current) {
        stateRef.current = stepSimulation(stateRef.current, dtSeconds);
        frameCount++;
        // Update React state every 3 frames (~20fps) for performance
        if (frameCount % 3 === 0) {
          setState({ ...stateRef.current });
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  const setRunning = useCallback((running: boolean) => {
    if (stateRef.current) {
      stateRef.current = { ...stateRef.current, running };
      setState({ ...stateRef.current });
    }
  }, []);

  const setSpeed = useCallback((speed: number) => {
    if (stateRef.current) {
      stateRef.current = { ...stateRef.current, speed };
      setState({ ...stateRef.current });
    }
  }, []);

  const setVehicleCount = useCallback((count: number) => {
    if (stateRef.current) {
      stateRef.current = { ...stateRef.current, vehicleCount: count };
      setState({ ...stateRef.current });
    }
  }, []);

  const reset = useCallback(() => {
    const initial = createInitialState(stateRef.current?.vehicleCount ?? vehicleCount);
    stateRef.current = initial;
    setState(initial);
  }, [vehicleCount]);

  return { state, setRunning, setSpeed, setVehicleCount, reset };
}
