import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

// ── Single premium coin ───────────────────────────────────────────────────────
// Thin, high-metalness disc — like a real gold coin, not a hockey puck
interface CoinProps {
  tiltX?: number;
  tiltZ?: number;
  spinSpeed?: number;
  shade?: "gold" | "rose";
}

// H glyph built from 3 box segments — raised above top face
function HGlyph({ y, color, envMapIntensity }: { y: number; color: string; envMapIntensity: number }) {
  const mat = (
    <meshStandardMaterial
      color={color}
      metalness={0.99}
      roughness={0.02}
      envMapIntensity={envMapIntensity}
    />
  );
  const h = 0.025; // extrusion height above face
  const thick = 0.055; // stroke width
  const armH = 0.28; // height of each vertical arm
  const xOff = 0.13; // distance each arm is from centre

  return (
    <group position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Left vertical bar */}
      <mesh position={[-xOff, 0, 0]}>
        <boxGeometry args={[thick, armH, h]} />
        {mat}
      </mesh>
      {/* Right vertical bar */}
      <mesh position={[xOff, 0, 0]}>
        <boxGeometry args={[thick, armH, h]} />
        {mat}
      </mesh>
      {/* Horizontal crossbar */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[xOff * 2 - thick * 0.1, thick, h]} />
        {mat}
      </mesh>
    </group>
  );
}

function Coin({ tiltX = 0, tiltZ = 0, spinSpeed = 0.4, shade = "gold" }: CoinProps) {
  const spinRef = useRef<THREE.Group>(null);

  const gold  = shade === "gold" ? "#f59e0b" : "#e8845e";
  const ring  = shade === "gold" ? "#d97706" : "#c96b45";
  const inner = shade === "gold" ? "#fde68a" : "#f4a57a";
  // H is slightly darker/richer than the inner disc so it catches light differently
  const hColor = shade === "gold" ? "#b45309" : "#9a4025";

  useFrame((_, delta) => {
    if (!spinRef.current) return;
    spinRef.current.rotation.y += delta * spinSpeed;
  });

  return (
    <group rotation={[tiltX, 0, tiltZ]}>
      <group ref={spinRef}>
        {/* Thin premium disc — r=1, thickness=0.08 (much thinner) */}
        <mesh castShadow>
          <cylinderGeometry args={[1, 1, 0.08, 128]} />
          <meshStandardMaterial color={gold} metalness={0.98} roughness={0.04} envMapIntensity={3.5} />
        </mesh>

        {/* Milled edge — slightly wider cylinder, barely visible from face */}
        <mesh>
          <cylinderGeometry args={[1.015, 1.015, 0.07, 128]} />
          <meshStandardMaterial color={ring} metalness={0.99} roughness={0.06} envMapIntensity={3} />
        </mesh>

        {/* Outer ring on top face — concentric engraving */}
        <mesh position={[0, 0.041, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.78, 0.92, 128]} />
          <meshStandardMaterial color={ring} metalness={0.99} roughness={0.03} envMapIntensity={4} polygonOffset polygonOffsetFactor={-1} />
        </mesh>
        <mesh position={[0, -0.041, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.78, 0.92, 128]} />
          <meshStandardMaterial color={ring} metalness={0.99} roughness={0.03} envMapIntensity={4} polygonOffset polygonOffsetFactor={-1} />
        </mesh>

        {/* Inner ring — second concentric */}
        <mesh position={[0, 0.041, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.56, 128]} />
          <meshStandardMaterial color={ring} metalness={0.99} roughness={0.03} envMapIntensity={4} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
        <mesh position={[0, -0.041, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.56, 128]} />
          <meshStandardMaterial color={ring} metalness={0.99} roughness={0.03} envMapIntensity={4} polygonOffset polygonOffsetFactor={-2} />
        </mesh>

        {/* Polished centre disc — mirror-like */}
        <mesh position={[0, 0.041, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.38, 128]} />
          <meshStandardMaterial color={inner} metalness={1} roughness={0.01} envMapIntensity={5} polygonOffset polygonOffsetFactor={-3} />
        </mesh>
        <mesh position={[0, -0.041, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.38, 128]} />
          <meshStandardMaterial color={inner} metalness={1} roughness={0.01} envMapIntensity={5} polygonOffset polygonOffsetFactor={-3} />
        </mesh>

        {/* Raised H — top and bottom faces */}
        <HGlyph y={0.044}  color={hColor} envMapIntensity={5} />
        <HGlyph y={-0.044} color={hColor} envMapIntensity={5} />
      </group>
    </group>
  );
}

// ── Three-coin composition ────────────────────────────────────────────────────
function Scene() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    // Gentle whole-scene drift — keeps it alive without being distracting
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.15) * 0.1;
    groupRef.current.position.y = Math.sin(clock.elapsedTime * 0.32) * 0.06;
  });

  return (
    <group ref={groupRef}>
      {/*
        COIN 1 — MAIN HERO
        Standing upright, slight lean. Dominates the right column.
        tiltX = π/2 makes it face the viewer edge-on → we want face-on.
        tiltX = 0 = flat horizontal (face up).
        tiltX = π/2 - 0.25 ≈ 1.32 = nearly vertical, leaning slightly toward camera.
      */}
      <group position={[0, 0, 0]} scale={1.35}>
        <Coin
          tiltX={Math.PI / 2 - 0.22}
          tiltZ={0.06}
          spinSpeed={0.3}
          shade="gold"
        />
      </group>

      {/*
        COIN 2 — SECONDARY
        More angled/tilted, positioned lower-right, smaller.
        Gives depth to the composition.
      */}
      <group position={[1.6, -1.2, -0.5]} scale={0.65}>
        <Coin
          tiltX={Math.PI / 2 - 0.7}   // more tilted, showing more of the face
          tiltZ={-0.3}
          spinSpeed={0.5}
          shade="gold"
        />
      </group>

      {/*
        COIN 3 — ACCENT
        Small, high up, slightly different angle. Rose gold shade for variety.
      */}
      <group position={[-1.3, 1.0, -0.9]} scale={0.42}>
        <Coin
          tiltX={Math.PI / 2 - 1.1}   // more face-on
          tiltZ={0.4}
          spinSpeed={0.7}
          shade="rose"
        />
      </group>
    </group>
  );
}

// ── Ambient particles ─────────────────────────────────────────────────────────
function Particles() {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 700;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 5 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.03;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.022}
        color="#fbbf24"
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function Coin3D() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 5.5], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0, background: "transparent" }}
    >
      {/* Bright warm studio lighting — higher ambient so coins read against light page bg */}
      <ambientLight intensity={1.2} color="#fff8f0" />
      <pointLight position={[6, 5, 4]}   intensity={8}   color="#ffffff" />
      <pointLight position={[-4, 3, 5]}  intensity={4}   color="#fde68a" />
      <pointLight position={[0, -3, 3]}  intensity={2.5} color="#fbbf24" />
      <pointLight position={[2, -1, -3]} intensity={1.5} color="#fed7aa" />
      {/* Rim light from behind to separate coin from background */}
      <pointLight position={[0, 0, -6]}  intensity={2}   color="#fff3c4" />
      <Suspense fallback={null}>
        <Scene />
        <Particles />
        <Environment preset="studio" />
      </Suspense>
    </Canvas>
  );
}
