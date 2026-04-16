import { Suspense, useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Text, RoundedBox, Center } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Maximize2, Minimize2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

// Color mapping based on vehicle color name
const getVehicleColor = (color?: string): string => {
  const colorMap: Record<string, string> = {
    white: "#f0f0f0", black: "#1a1a1a", silver: "#c0c0c0", gray: "#808080",
    grey: "#808080", red: "#cc2222", blue: "#2255cc", green: "#228844",
    yellow: "#ccaa22", orange: "#cc6622", brown: "#664422", gold: "#daa520",
    beige: "#f5f5dc", maroon: "#800000", navy: "#000080", cream: "#fffdd0",
  };
  return colorMap[(color || "white").toLowerCase()] || "#c0c0c0";
};

// Status color for accents
const getStatusColor = (status?: string): string => {
  switch (status) {
    case "active": return "#22c55e";
    case "maintenance": return "#eab308";
    case "inactive": return "#ef4444";
    default: return "#6b7280";
  }
};

// ---------- Vehicle Body Components ----------

function Wheel({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.x += delta * 2;
  });
  return (
    <group position={position}>
      <mesh ref={ref} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.12, 24]} />
        <meshStandardMaterial color="#222" roughness={0.6} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 0.13, 12]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function SedanBody({ bodyColor, statusColor }: { bodyColor: string; statusColor: string }) {
  return (
    <group>
      {/* Main body */}
      <RoundedBox args={[2.4, 0.5, 1]} radius={0.08} position={[0, 0.35, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.3} />
      </RoundedBox>
      {/* Cabin */}
      <RoundedBox args={[1.4, 0.45, 0.9]} radius={0.1} position={[0.1, 0.75, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.3} />
      </RoundedBox>
      {/* Windows */}
      <RoundedBox args={[1.3, 0.3, 0.92]} radius={0.05} position={[0.1, 0.78, 0]}>
        <meshPhysicalMaterial color="#1a2a3a" metalness={0.1} roughness={0.1} transmission={0.6} thickness={0.1} />
      </RoundedBox>
      {/* Headlights */}
      <mesh position={[1.2, 0.35, 0.35]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ffffdd" emissive="#ffffaa" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[1.2, 0.35, -0.35]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ffffdd" emissive="#ffffaa" emissiveIntensity={0.5} />
      </mesh>
      {/* Tail lights */}
      <mesh position={[-1.2, 0.35, 0.35]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-1.2, 0.35, -0.35]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={0.3} />
      </mesh>
      {/* Status indicator light on roof */}
      <mesh position={[0.1, 1.0, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={1} />
      </mesh>
      {/* Wheels */}
      <Wheel position={[0.7, 0.1, 0.55]} />
      <Wheel position={[-0.7, 0.1, 0.55]} />
      <Wheel position={[0.7, 0.1, -0.55]} />
      <Wheel position={[-0.7, 0.1, -0.55]} />
    </group>
  );
}

function TruckBody({ bodyColor, statusColor }: { bodyColor: string; statusColor: string }) {
  return (
    <group>
      {/* Cab */}
      <RoundedBox args={[1.0, 0.7, 1]} radius={0.08} position={[0.9, 0.45, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.5} roughness={0.3} />
      </RoundedBox>
      {/* Cab windshield */}
      <RoundedBox args={[0.05, 0.4, 0.85]} radius={0.02} position={[1.42, 0.55, 0]}>
        <meshPhysicalMaterial color="#1a2a3a" metalness={0.1} roughness={0.1} transmission={0.5} thickness={0.1} />
      </RoundedBox>
      {/* Cargo box */}
      <RoundedBox args={[2.0, 0.9, 1.1]} radius={0.04} position={[-0.6, 0.55, 0]}>
        <meshStandardMaterial color="#e8e8e8" metalness={0.3} roughness={0.5} />
      </RoundedBox>
      {/* Chassis */}
      <RoundedBox args={[3.2, 0.15, 0.8]} radius={0.02} position={[0, 0.12, 0]}>
        <meshStandardMaterial color="#333" metalness={0.7} roughness={0.4} />
      </RoundedBox>
      {/* Headlights */}
      <mesh position={[1.45, 0.4, 0.4]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#ffffdd" emissive="#ffffaa" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[1.45, 0.4, -0.4]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#ffffdd" emissive="#ffffaa" emissiveIntensity={0.5} />
      </mesh>
      {/* Status light */}
      <mesh position={[0.9, 0.85, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={1} />
      </mesh>
      {/* Front wheels */}
      <Wheel position={[0.9, 0.05, 0.55]} />
      <Wheel position={[0.9, 0.05, -0.55]} />
      {/* Rear double axle */}
      <Wheel position={[-0.7, 0.05, 0.55]} />
      <Wheel position={[-0.7, 0.05, -0.55]} />
      <Wheel position={[-1.1, 0.05, 0.55]} />
      <Wheel position={[-1.1, 0.05, -0.55]} />
    </group>
  );
}

function SUVBody({ bodyColor, statusColor }: { bodyColor: string; statusColor: string }) {
  return (
    <group>
      {/* Main body - taller than sedan */}
      <RoundedBox args={[2.2, 0.65, 1.05]} radius={0.08} position={[0, 0.45, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.3} />
      </RoundedBox>
      {/* Cabin */}
      <RoundedBox args={[1.5, 0.5, 0.95]} radius={0.1} position={[0, 0.9, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.3} />
      </RoundedBox>
      {/* Windows */}
      <RoundedBox args={[1.4, 0.35, 0.97]} radius={0.05} position={[0, 0.92, 0]}>
        <meshPhysicalMaterial color="#1a2a3a" metalness={0.1} roughness={0.1} transmission={0.6} thickness={0.1} />
      </RoundedBox>
      {/* Roof rack */}
      <RoundedBox args={[1.2, 0.03, 0.8]} radius={0.01} position={[0, 1.17, 0]}>
        <meshStandardMaterial color="#444" metalness={0.8} roughness={0.3} />
      </RoundedBox>
      {/* Headlights */}
      <mesh position={[1.1, 0.45, 0.38]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#ffffdd" emissive="#ffffaa" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[1.1, 0.45, -0.38]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#ffffdd" emissive="#ffffaa" emissiveIntensity={0.5} />
      </mesh>
      {/* Status light */}
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={1} />
      </mesh>
      {/* Bigger wheels */}
      <Wheel position={[0.7, 0.12, 0.58]} />
      <Wheel position={[-0.7, 0.12, 0.58]} />
      <Wheel position={[0.7, 0.12, -0.58]} />
      <Wheel position={[-0.7, 0.12, -0.58]} />
    </group>
  );
}

function BusBody({ bodyColor, statusColor }: { bodyColor: string; statusColor: string }) {
  return (
    <group>
      {/* Main body */}
      <RoundedBox args={[3.2, 0.9, 1]} radius={0.06} position={[0, 0.55, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.5} roughness={0.3} />
      </RoundedBox>
      {/* Window strip */}
      <RoundedBox args={[2.8, 0.3, 1.02]} radius={0.03} position={[0, 0.75, 0]}>
        <meshPhysicalMaterial color="#1a2a3a" metalness={0.1} roughness={0.1} transmission={0.5} thickness={0.1} />
      </RoundedBox>
      {/* Windshield */}
      <RoundedBox args={[0.05, 0.5, 0.92]} radius={0.02} position={[1.6, 0.7, 0]}>
        <meshPhysicalMaterial color="#1a2a3a" metalness={0.1} roughness={0.1} transmission={0.6} thickness={0.1} />
      </RoundedBox>
      {/* Headlights */}
      <mesh position={[1.62, 0.45, 0.38]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#ffffdd" emissive="#ffffaa" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[1.62, 0.45, -0.38]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#ffffdd" emissive="#ffffaa" emissiveIntensity={0.5} />
      </mesh>
      {/* Status light */}
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={1} />
      </mesh>
      {/* Wheels */}
      <Wheel position={[1.1, 0.05, 0.55]} />
      <Wheel position={[1.1, 0.05, -0.55]} />
      <Wheel position={[-1.1, 0.05, 0.55]} />
      <Wheel position={[-1.1, 0.05, -0.55]} />
    </group>
  );
}

// ---------- Plate label ----------

function PlateLabel({ text, position }: { text: string; position: [number, number, number] }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.6, 0.15, 0.01]} radius={0.02}>
        <meshStandardMaterial color="#ffffff" />
      </RoundedBox>
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.06}
        color="#111111"
        anchorX="center"
        anchorY="middle"
        font="/fonts/inter-v12-latin-700.woff"
      >
        {text}
      </Text>
    </group>
  );
}

// ---------- Auto-rotate scene ----------

function AutoRotate({ enabled }: { enabled: boolean }) {
  const ref = useRef<any>(null);
  useFrame((_, delta) => {
    if (enabled && ref.current) {
      ref.current.rotation.y += delta * 0.3;
    }
  });
  return <group ref={ref} />;
}

// ---------- Scene ----------

function VehicleScene({ vehicleType, color, status, plate, autoRotate }: {
  vehicleType: string;
  color: string;
  status: string;
  plate: string;
  autoRotate: boolean;
}) {
  const bodyColor = useMemo(() => getVehicleColor(color), [color]);
  const statusColor = useMemo(() => getStatusColor(status), [status]);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  const VehicleComponent = useMemo(() => {
    const type = vehicleType?.toLowerCase() || "";
    if (type.includes("truck") || type.includes("lorry") || type.includes("cargo")) return TruckBody;
    if (type.includes("bus") || type.includes("coaster") || type.includes("mini_bus") || type.includes("midi_bus")) return BusBody;
    if (type.includes("suv") || type.includes("double_cab") || type.includes("pickup") || type.includes("single_cab")) return SUVBody;
    return SedanBody;
  }, [vehicleType]);

  const platePosition = useMemo((): [number, number, number] => {
    const type = vehicleType?.toLowerCase() || "";
    if (type.includes("truck")) return [1.46, 0.25, 0];
    if (type.includes("bus")) return [1.63, 0.35, 0];
    return [1.21, 0.2, 0];
  }, [vehicleType]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-3, 4, -3]} intensity={0.4} />
      <directionalLight position={[0, 2, -5]} intensity={0.3} />
      <spotLight position={[0, 6, 0]} intensity={0.5} angle={0.4} penumbra={0.5} />
      <hemisphereLight args={["#b1e1ff", "#b97a20", 0.5]} />

      <group ref={groupRef}>
        <Center>
          <VehicleComponent bodyColor={bodyColor} statusColor={statusColor} />
          <PlateLabel text={plate} position={platePosition} />
        </Center>
      </group>

      <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={8} blur={2} far={4} />
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={2}
        maxDistance={8}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.1}
        autoRotate={false}
      />
    </>
  );
}

// ---------- Main component ----------

interface Vehicle3DViewerProps {
  vehicleType?: string;
  color?: string;
  status?: string;
  plate?: string;
  make?: string;
  model?: string;
  className?: string;
}

const Vehicle3DViewer = ({
  vehicleType = "sedan",
  color = "silver",
  status = "active",
  plate = "—",
  make,
  model,
  className,
}: Vehicle3DViewerProps) => {
  const [autoRotate, setAutoRotate] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      setWebglSupported(!!gl);
    } catch {
      setWebglSupported(false);
    }
  }, []);

  // Timeout fallback: if canvas doesn't signal ready in 8s, show fallback
  useEffect(() => {
    if (webglSupported === false) return;
    const timer = setTimeout(() => {
      if (!canvasReady) setWebglSupported(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [webglSupported, canvasReady]);

  const FallbackView = () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-muted/30 to-muted/10">
      <div className="text-center space-y-3 p-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
          <Eye className="w-10 h-10 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">{plate}</p>
          <p className="text-xs text-muted-foreground">{make} {model}</p>
        </div>
        <Badge variant="outline" className="capitalize">
          {vehicleType?.replace(/_/g, " ") || "sedan"}
        </Badge>
        <p className="text-[10px] text-muted-foreground max-w-[200px] mx-auto">
          3D viewer requires WebGL. Open in a desktop browser for the full experience.
        </p>
      </div>
    </div>
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            3D Vehicle View
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[10px] capitalize">
              {vehicleType?.replace(/_/g, " ") || "sedan"}
            </Badge>
            {webglSupported !== false && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setAutoRotate(!autoRotate)}
                  title={autoRotate ? "Stop rotation" : "Auto rotate"}
                >
                  <RotateCcw className={cn("w-3.5 h-3.5", autoRotate && "animate-spin")} style={{ animationDuration: "3s" }} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className={cn(
          "w-full transition-all duration-300",
          expanded ? "h-[400px]" : "h-[250px]"
        )}>
          {webglSupported === false ? (
            <FallbackView />
          ) : (
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-muted/30 to-muted/10">
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground">Loading 3D model...</p>
                </div>
              </div>
            }>
              <Canvas
                camera={{ position: [3, 2, 3], fov: 45 }}
                dpr={[1, 2]}
                gl={{ antialias: true, alpha: true, failIfMajorPerformanceCaveat: false }}
                style={{ width: "100%", height: "100%", background: "transparent" }}
                onCreated={() => setCanvasReady(true)}
              >
                <VehicleScene
                  vehicleType={vehicleType}
                  color={color}
                  status={status}
                  plate={plate}
                  autoRotate={autoRotate}
                />
              </Canvas>
            </Suspense>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 p-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground">
            {webglSupported === false ? `${make} ${model}` : `Drag to rotate • Scroll to zoom • ${make} ${model}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default Vehicle3DViewer;
