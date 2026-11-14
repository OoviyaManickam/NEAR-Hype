/**
 * HypeScene3D — Isometric 3D scene (Three.js / R3F)
 *
 * Orthographic camera at the standard isometric angle so cubes show
 * top + two side faces. RoundedBoxGeometry for all cubes.
 * Layout mirrors the reference: DEGENS → HUB → HOLDERS/LIQUIDITY/COMMUNITY → BUYER
 */
import { useRef, useMemo, Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, Environment } from "@react-three/drei";
import * as THREE from "three";

// ─── Palette ──────────────────────────────────────────────────────────────────
const COL = {
  cubeWhite:   new THREE.Color("#F8F7FF"),
  cubeShadow:  new THREE.Color("#DDD8F5"),
  padPurple:   new THREE.Color("#7C5CFC"),
  padDark:     new THREE.Color("#5438C8"),
  hubPurple:   new THREE.Color("#6D4AFF"),
  hubDark:     new THREE.Color("#4527D0"),
  glowPink:    new THREE.Color("#C084FC"),
  amber:       new THREE.Color("#F59E0B"),
  amberDark:   new THREE.Color("#B8960C"),
  amberLight:  new THREE.Color("#FDE68A"),
  labelBlue:   new THREE.Color("#3B0764"),
  wire:        new THREE.Color("#A78BFA"),
  tubeColor:   new THREE.Color("#C4B5FD"),
};

// ─── Shared material factories ────────────────────────────────────────────────
function whiteMat() {
  return new THREE.MeshStandardMaterial({
    color: COL.cubeWhite,
    roughness: 0.18,
    metalness: 0.02,
  });
}
function purpleMat(gloss = false) {
  return new THREE.MeshStandardMaterial({
    color: gloss ? COL.hubPurple : COL.padPurple,
    roughness: gloss ? 0.08 : 0.15,
    metalness: gloss ? 0.25 : 0.1,
    envMapIntensity: gloss ? 2.5 : 1.2,
  });
}

// ─── Node cube: white body + purple top pad ───────────────────────────────────
interface NodeProps {
  pos: [number, number, number];
  label: string;
  size?: number;
  bobOffset?: number;
  padColor?: THREE.Color;
}

function NodeCube({ pos, label, size = 1, bobOffset = 0, padColor = COL.padPurple }: NodeProps) {
  const group = useRef<THREE.Group>(null);

  // white body mat — created once
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: COL.cubeWhite, roughness: 0.2, metalness: 0.02,
  }), []);
  const padMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: padColor, roughness: 0.12, metalness: 0.08, envMapIntensity: 1.5,
  }), [padColor]);
  const padRimMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: COL.padDark, roughness: 0.3, metalness: 0.05,
  }), []);
  const shadowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("#8B7FCC"), transparent: true, opacity: 0.13,
    roughness: 1, metalness: 0,
  }), []);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.position.y = pos[1] + Math.sin(clock.elapsedTime * 0.85 + bobOffset) * 0.06;
  });

  const S = size;
  const pad  = S * 0.72;  // pad width
  const padH = S * 0.04;
  const padY = S * 0.5 + padH / 2;
  const rimW = S * 0.79;
  const rimH = S * 0.055;
  const rimY = S * 0.5 + rimH / 2 - 0.005;

  return (
    <group ref={group} position={pos}>
      {/* Blurred shadow ellipse on ground */}
      <mesh position={[0, -S * 0.5 - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[S * 0.7, S * 0.5, 1]}>
        <circleGeometry args={[1, 32]} />
        <primitive object={shadowMat} attach="material" />
      </mesh>

      {/* White rounded body */}
      <RoundedBox args={[S, S, S]} radius={S * 0.1} smoothness={4} castShadow receiveShadow>
        <primitive object={bodyMat} attach="material" />
      </RoundedBox>

      {/* Purple rim (outer edge of pad) */}
      <mesh position={[0, rimY, 0]}>
        <boxGeometry args={[rimW, rimH, rimW]} />
        <primitive object={padRimMat} attach="material" />
      </mesh>

      {/* Purple glossy pad (inset) */}
      <mesh position={[0, padY, 0]}>
        <boxGeometry args={[pad, padH, pad]} />
        <primitive object={padMat} attach="material" />
      </mesh>

      {/* Corner dots on pad */}
      {[[1,1],[1,-1],[-1,1],[-1,-1]].map(([dx,dz],i) => (
        <mesh key={i} position={[dx * pad*0.46, padY + padH*0.5, dz * pad*0.46]}>
          <sphereGeometry args={[S*0.025, 8, 8]} />
          <meshStandardMaterial color="#FDE68A" emissive="#FDE68A" emissiveIntensity={0.8} />
        </mesh>
      ))}

      {/* Label — flat text on front face (−Z face) */}
      <FaceLabel text={label} y={0} z={S * 0.51} size={S * 0.18} />
    </group>
  );
}

// ─── Hub (larger, glossy purple) ─────────────────────────────────────────────
function HubCube({ pos }: { pos: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  const S = 1.5;

  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: COL.hubPurple, roughness: 0.06, metalness: 0.3,
    envMapIntensity: 3,
  }), []);
  const darkMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: COL.hubDark, roughness: 0.1, metalness: 0.2,
  }), []);
  const glowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: COL.glowPink,
    emissive: COL.glowPink,
    emissiveIntensity: 1.2,
    roughness: 0.05,
    transparent: true,
    opacity: 0.9,
  }), []);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.position.y = pos[1] + Math.sin(clock.elapsedTime * 0.7) * 0.07;
    if (glowRef.current) {
      glowRef.current.intensity = 2.5 + Math.sin(clock.elapsedTime * 1.8) * 1.2;
    }
  });

  return (
    <group ref={group} position={pos}>
      {/* Drop shadow */}
      <mesh position={[0, -S*0.5-0.01, 0]} rotation={[-Math.PI/2,0,0]} scale={[S*0.75, S*0.55, 1]}>
        <circleGeometry args={[1, 32]} />
        <meshStandardMaterial color={new THREE.Color("#6040CC")} transparent opacity={0.18} roughness={1} />
      </mesh>

      {/* Body */}
      <RoundedBox args={[S, S, S]} radius={S*0.08} smoothness={5} castShadow>
        <primitive object={bodyMat} attach="material" />
      </RoundedBox>

      {/* Top glowing pad */}
      <mesh position={[0, S*0.5 + 0.02, 0]}>
        <boxGeometry args={[S*0.68, S*0.035, S*0.68]} />
        <primitive object={glowMat} attach="material" />
      </mesh>

      {/* Glowing lines (neon strips) on top face */}
      {[-0.22, 0, 0.22].map((x, i) => (
        <mesh key={i} position={[x * S*0.4, S*0.51, 0]}>
          <boxGeometry args={[S*0.05, S*0.015, S*0.55]} />
          <meshStandardMaterial
            color={COL.glowPink} emissive={COL.glowPink} emissiveIntensity={2}
            transparent opacity={0.95}
          />
        </mesh>
      ))}

      {/* HYPE logo face (front −Z) — glowing text proxy */}
      <mesh position={[0, 0, S*0.51]}>
        <planeGeometry args={[S*0.7, S*0.35]} />
        <meshStandardMaterial
          color={COL.glowPink} emissive={COL.glowPink} emissiveIntensity={0.4}
          transparent opacity={0.15}
        />
      </mesh>
      <FaceLabel text="$HYPE" y={0} z={S*0.51 + 0.001} size={S*0.21} color="#E8D8FF" />

      {/* Internal point light — creates the glow effect */}
      <pointLight ref={glowRef} color={COL.glowPink} intensity={2.5} distance={3} decay={2} />
    </group>
  );
}

// ─── 3D text via canvas texture ───────────────────────────────────────────────
function FaceLabel({ text, y, z, size, color = "#3B1A78" }: {
  text: string; y: number; z: number; size: number; color?: string;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 80;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 256, 80);
    ctx.font = `bold ${Math.round(size * 256 * 2)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "4px";
    ctx.fillText(text.toUpperCase(), 128, 40);
    const t = new THREE.CanvasTexture(canvas);
    t.needsUpdate = true;
    return t;
  }, [text, size, color]);

  return (
    <mesh position={[0, y, z]}>
      <planeGeometry args={[1.0, 0.32]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.05} depthWrite={false} />
    </mesh>
  );
}

// ─── Wireframe cube floating above node ──────────────────────────────────────
function WireframeCube({ pos, bobOffset = 0 }: { pos: [number, number, number]; bobOffset?: number }) {
  const ref = useRef<THREE.Group>(null);
  const S = 0.32;

  const edges = useMemo(() => {
    const geo = new THREE.BoxGeometry(S, S, S);
    return new THREE.EdgesGeometry(geo);
  }, []);

  const mat = useMemo(() => new THREE.LineBasicMaterial({
    color: COL.wire, transparent: true, opacity: 0.85,
  }), []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = pos[1] + Math.sin(clock.elapsedTime * 1.1 + bobOffset) * 0.08;
    ref.current.rotation.y += 0.008;
    ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.6 + bobOffset) * 0.15;
  });

  return (
    <group ref={ref} position={pos}>
      {/* Glow fill */}
      <mesh>
        <boxGeometry args={[S, S, S]} />
        <meshStandardMaterial color={COL.wire} emissive={COL.wire} emissiveIntensity={0.3}
          transparent opacity={0.08} />
      </mesh>
      {/* Wire edges */}
      <lineSegments geometry={edges} material={mat} />
    </group>
  );
}

// ─── Gold coin ────────────────────────────────────────────────────────────────
function GoldCoin({ pos, angle, bobOffset = 0 }: {
  pos: [number, number, number]; angle: number; bobOffset?: number;
}) {
  const ref = useRef<THREE.Group>(null);

  const faceMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: COL.amber, roughness: 0.08, metalness: 0.95, envMapIntensity: 3,
  }), []);
  const edgeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: COL.amberDark, roughness: 0.15, metalness: 0.9, envMapIntensity: 2,
  }), []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = pos[1] + Math.sin(clock.elapsedTime * 0.9 + bobOffset) * 0.09;
    ref.current.rotation.z += 0.012;
  });

  return (
    <group ref={ref} position={pos} rotation={[angle, 0, 0]}>
      {/* Coin face */}
      <mesh>
        <cylinderGeometry args={[0.28, 0.28, 0.07, 40]} />
        <primitive object={faceMat} attach="material" />
      </mesh>
      {/* Thicker rim */}
      <mesh>
        <torusGeometry args={[0.28, 0.04, 12, 40]} />
        <primitive object={edgeMat} attach="material" />
      </mesh>
      {/* Shine highlight */}
      <mesh position={[-0.06, 0.036, -0.04]} scale={[0.08, 0.05, 1]}>
        <circleGeometry args={[1, 16]} />
        <meshBasicMaterial color="#FFFDE0" transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ─── Glass tube segment ───────────────────────────────────────────────────────
// Single straight segment; compose for right-angle bends
function TubeSegment({ from, to, radius = 0.055 }: {
  from: THREE.Vector3; to: THREE.Vector3; radius?: number;
}) {
  const mid = useMemo(() => from.clone().add(to).multiplyScalar(0.5), [from, to]);
  const dir = useMemo(() => to.clone().sub(from), [from, to]);
  const length = dir.length();

  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
    return q;
  }, [dir]);

  const glassMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#D4C8FF"),
    transparent: true,
    opacity: 0.55,
    roughness: 0.0,
    metalness: 0.0,
    transmission: 0.6,
    thickness: radius * 2,
    envMapIntensity: 1.5,
    side: THREE.DoubleSide,
  }), [radius]);

  const highlightMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#FFFFFF", transparent: true, opacity: 0.4,
    roughness: 0, metalness: 0,
  }), []);

  return (
    <group position={mid} quaternion={quat}>
      {/* Glass body */}
      <mesh>
        <cylinderGeometry args={[radius, radius, length, 16]} />
        <primitive object={glassMat} attach="material" />
      </mesh>
      {/* White specular stripe */}
      <mesh position={[radius*0.45, 0, 0]}>
        <cylinderGeometry args={[radius*0.15, radius*0.15, length, 8]} />
        <primitive object={highlightMat} attach="material" />
      </mesh>
    </group>
  );
}

// Elbow connector (two segments forming a right-angle bend)
function TubeElbow({ a, corner, b }: { a: THREE.Vector3; corner: THREE.Vector3; b: THREE.Vector3 }) {
  return (
    <group>
      <TubeSegment from={a} to={corner} />
      <TubeSegment from={corner} to={b} />
      {/* Ball joint at corner */}
      <mesh position={corner}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color={new THREE.Color("#C4B5FD")} roughness={0.1} metalness={0.1} />
      </mesh>
    </group>
  );
}

// ─── Travelling glowing dot on a path ─────────────────────────────────────────
function TravelDot({ points, speed = 0.6, offset = 0, color = "#A78BFA" }: {
  points: THREE.Vector3[]; speed?: number; offset?: number; color?: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const totalLen = useMemo(() => {
    let l = 0;
    for (let i = 1; i < points.length; i++) l += points[i].distanceTo(points[i-1]);
    return l;
  }, [points]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = ((clock.elapsedTime * speed + offset) % 1);
    let target = t * totalLen;
    let pos = points[0].clone();
    for (let i = 1; i < points.length; i++) {
      const seg = points[i].distanceTo(points[i-1]);
      if (target <= seg) {
        pos = points[i-1].clone().lerp(points[i], target / seg);
        break;
      }
      target -= seg;
      if (i === points.length - 1) pos = points[i].clone();
    }
    ref.current.position.copy(pos);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.065, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5}
        transparent opacity={0.95} />
    </mesh>
  );
}

// ─── Full scene ───────────────────────────────────────────────────────────────
// Node world positions — isometric grid: X = right, Z = away, Y = up
// Lay out like the reference: hub centre-left, stores fan right + up
const HUB_POS:     [number,number,number] = [  0,    0,   0   ];
const DEGENS_POS:  [number,number,number] = [ -3.2, -0.2,  1.8 ];
const STORE1_POS:  [number,number,number] = [ -0.8,  0.8, -2.2 ]; // HOLDERS top
const STORE2_POS:  [number,number,number] = [  2.2,  0.4, -0.8 ]; // LIQUIDITY mid-right
const STORE3_POS:  [number,number,number] = [  2.4, -0.4,  1.8 ]; // COMMUNITY bottom-right
const BUYER_POS:   [number,number,number] = [  0.8,  1.4, -3.8 ]; // top-right

function IsoScene() {
  // Tube waypoints — right-angle bends matching the reference
  // Hub exits at its face centre (~0.76 from centre)
  const hubR = 0.76;  // half hub size + small gap

  const tubes = useMemo(() => {
    const H = new THREE.Vector3(...HUB_POS);
    const D = new THREE.Vector3(...DEGENS_POS);
    const S1 = new THREE.Vector3(...STORE1_POS);
    const S2 = new THREE.Vector3(...STORE2_POS);
    const S3 = new THREE.Vector3(...STORE3_POS);
    const B  = new THREE.Vector3(...BUYER_POS);

    return [
      // DEGENS → HUB
      { pts: [D.clone().add(new THREE.Vector3( 0.5, 0, 0)), new THREE.Vector3(-1.5, -0.1, 0.9), H.clone().add(new THREE.Vector3(-hubR, 0, 0))], color: "#93C5FD", speed: 0.5 },
      // HUB → HOLDERS (top)
      { pts: [H.clone().add(new THREE.Vector3( 0, 0, -hubR)), new THREE.Vector3(-0.4, 0.4, -1.4), S1.clone().add(new THREE.Vector3(0, 0, 0.5))], color: "#C4B5FD", speed: 0.6 },
      // HUB → LIQUIDITY
      { pts: [H.clone().add(new THREE.Vector3( hubR, 0, 0)), new THREE.Vector3(1.1, 0.2, -0.4), S2.clone().add(new THREE.Vector3(-0.5, 0, 0))], color: "#86EFAC", speed: 0.7 },
      // HUB → COMMUNITY
      { pts: [H.clone().add(new THREE.Vector3( hubR, 0, 0)), new THREE.Vector3(1.1, 0, 0.9), S3.clone().add(new THREE.Vector3(-0.5, 0, 0))], color: "#FCA5A5", speed: 0.55 },
      // HUB → BUYER (coins come out here)
      { pts: [S1.clone().add(new THREE.Vector3(0, 0, -0.5)), new THREE.Vector3(0.2, 1.1, -2.8), B.clone().add(new THREE.Vector3(0, 0, 0.5))], color: "#FDE68A", speed: 0.45 },
    ];
  }, []);

  return (
    <>
      {/* Lighting ─────────────────────────────────────────────────── */}
      <ambientLight intensity={1.8} color="#F0EEFF" />
      <directionalLight
        position={[6, 10, 6]} intensity={3.5} color="#FFFFFF"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <pointLight position={[-4, 6, 4]}  intensity={2}   color="#A78BFA" />
      <pointLight position={[4,  4, -4]} intensity={1.5} color="#FFFFFF" />
      <pointLight position={[0, -2, 4]}  intensity={1}   color="#E0D8FF" />

      {/* Environment for reflections */}
      <Environment preset="city" />

      {/* Tubes (behind nodes) */}
      {tubes.map((t, i) => (
        <group key={i}>
          {t.pts.length === 3 ? (
            <TubeElbow
              a={t.pts[0]} corner={t.pts[1]} b={t.pts[2]}
            />
          ) : (
            <TubeSegment from={t.pts[0]} to={t.pts[1]} />
          )}
          <TravelDot points={t.pts} speed={t.speed} offset={i * 0.2} color={t.color} />
          <TravelDot points={t.pts} speed={t.speed} offset={i * 0.2 + 0.5} color={t.color} />
        </group>
      ))}

      {/* Nodes ────────────────────────────────────────────────────── */}
      <NodeCube pos={DEGENS_POS}  label="DEGENS"    bobOffset={0}   />
      <NodeCube pos={STORE1_POS}  label="HOLDERS"   bobOffset={1.1} />
      <NodeCube pos={STORE2_POS}  label="LIQUIDITY" bobOffset={2.2} />
      <NodeCube pos={STORE3_POS}  label="COMMUNITY" bobOffset={3.3} />
      <NodeCube pos={BUYER_POS}   label="BUYER"     bobOffset={0.6} />
      <HubCube  pos={HUB_POS} />

      {/* Wireframe cubes above store nodes */}
      <WireframeCube pos={[STORE1_POS[0], STORE1_POS[1]+1.05, STORE1_POS[2]]} bobOffset={0} />
      <WireframeCube pos={[STORE2_POS[0], STORE2_POS[1]+1.05, STORE2_POS[2]]} bobOffset={1.2} />
      <WireframeCube pos={[STORE3_POS[0], STORE3_POS[1]+1.05, STORE3_POS[2]]} bobOffset={2.4} />

      {/* Gold coins above BUYER */}
      <GoldCoin pos={[BUYER_POS[0]-0.55, BUYER_POS[1]+1.1, BUYER_POS[2]-0.1]} angle={0.5}  bobOffset={0}   />
      <GoldCoin pos={[BUYER_POS[0]+0.0,  BUYER_POS[1]+1.6, BUYER_POS[2]+0.2]} angle={-0.4} bobOffset={0.8} />
      <GoldCoin pos={[BUYER_POS[0]+0.5,  BUYER_POS[1]+0.9, BUYER_POS[2]-0.3]} angle={0.9}  bobOffset={1.4} />
    </>
  );
}

// ─── Isometric camera setup ───────────────────────────────────────────────────
// Sets up orthographic projection + isometric angle imperatively — drei's
// OrthographicCamera doesn't call lookAt by default so we do it manually.
function IsoCameraSetup() {
  const { camera, size } = useThree();

  useEffect(() => {
    const zoom = 72;
    const w = size.width / 2 / zoom;
    const h = size.height / 2 / zoom;

    // Replace with an orthographic camera
    const oc = camera as THREE.OrthographicCamera;
    oc.left   = -w;
    oc.right  =  w;
    oc.top    =  h;
    oc.bottom = -h;
    oc.near   = -50;
    oc.far    =  100;
    oc.zoom   = 1;

    // Isometric position: equal distance along X, Y, Z
    oc.position.set(8, 8, 8);
    oc.lookAt(0, 0, 0);
    oc.updateProjectionMatrix();
  }, [camera, size]);

  return null;
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function HypeScene3D() {
  return (
    <>
      {/* Lavender background panel */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 75% 70% at 55% 50%, #EDE9FE 0%, #F4F3FF 45%, transparent 100%)",
        pointerEvents: "none",
      }} />

      <Canvas
        orthographic
        camera={{ position: [8, 8, 8], zoom: 72, near: -50, far: 100 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        shadows
        style={{ position: "absolute", inset: 0, background: "transparent" }}
      >
        <IsoCameraSetup />
        <Suspense fallback={null}>
          <IsoScene />
        </Suspense>
      </Canvas>

      {/* Caption — HTML overlay, bottom-right, no SVG */}
      <div style={{
        position: "absolute", bottom: 14, right: 18,
        fontFamily: "Inter, var(--sans), system-ui, sans-serif",
        fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
        color: "#5438C8", opacity: 0.5,
        pointerEvents: "none",
        userSelect: "none",
      }}>
        Hype Powered Trading
      </div>
    </>
  );
}
