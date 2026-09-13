"use client";
import { Component, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Cloud, MeshReflectorMaterial, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import * as THREE from "three";

export function SceneErrorBoundary({ fallback, children }) {
  return <Boundary fallback={fallback}>{children}</Boundary>;
}

class Boundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {}
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export function ChamberFallback({ label = "Living world unavailable" }) {
  return (
    <div
      role="img"
      aria-label={label}
      style={{
        height: "100%",
        minHeight: 280,
        borderRadius: 12,
        background:
          "radial-gradient(480px 240px at 50% 68%, rgba(44,191,163,.2), transparent 65%), radial-gradient(340px 220px at 78% 22%, rgba(246,183,95,.14), transparent 60%), linear-gradient(180deg,#17263a,#101827)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-2)",
        fontSize: 13,
      }}
    >
      {label} — all controls below work without it.
    </div>
  );
}

// Six living biomes, one per attribute. Static angles so parents can aim wisps.
export const BIOMES = [
  { attr: "STR", color: "#d9a066", label: "Sanctuary" },
  { attr: "INT", color: "#8fa8f8", label: "Library" },
  { attr: "DIS", color: "#c9d4e8", label: "Observatory" },
  { attr: "HLT", color: "#2cbfa3", label: "Gardens" },
  { attr: "CRT", color: "#a98be8", label: "Art biome" },
  { attr: "SOC", color: "#f6b75f", label: "Hearth" },
];

export function padPosition(attr) {
  const i = Math.max(0, BIOMES.findIndex((b) => b.attr === attr));
  const a = (i / BIOMES.length) * Math.PI * 2;
  return [Math.cos(a) * 3.1, 0.32, Math.sin(a) * 3.1];
}

const MOODS = {
  dawn: { bg: "#16233a", hemiSky: "#8fa8f8", hemiGround: "#20301f", key: "#ffe0ae", keyI: 1.15 },
  day: { bg: "#1b2f52", hemiSky: "#bcd0f5", hemiGround: "#24402f", key: "#ffedd0", keyI: 1.5 },
  dusk: { bg: "#2a1f33", hemiSky: "#e8a58e", hemiGround: "#1d1a26", key: "#f4a58a", keyI: 1.0 },
};

function BurstLight({ pulse, color }) {
  const ref = useRef();
  const energy = useRef(0);
  useEffect(() => {
    if (pulse > 0) energy.current = 1;
  }, [pulse]);
  useFrame((_, dt) => {
    energy.current = Math.max(0, energy.current - dt * 1.3);
    if (ref.current) ref.current.intensity = 1.4 + energy.current * 8;
  });
  return <pointLight ref={ref} position={[0, 1.8, 1.4]} color={color} distance={14} />;
}

// The Aether Heart: layered crystal that grows richer with level + progress.
function AetherHeart({ level, progress, rankColor, pulse, reducedMotion }) {
  const inner = useRef();
  const shell = useRef();
  const energy = useRef(0);

  useEffect(() => {
    if (pulse > 0) energy.current = 1;
  }, [pulse]);

  const s = 0.72 + Math.min(1, progress) * 0.22 + Math.min(10, level) * 0.014;

  useFrame((state, dt) => {
    energy.current = Math.max(0, energy.current - dt * 1.1);
    const t = state.clock.elapsedTime;
    if (!reducedMotion) {
      if (inner.current) inner.current.rotation.y += dt * 0.45;
      if (shell.current) {
        shell.current.rotation.y -= dt * 0.18;
        shell.current.rotation.x = Math.sin(t * 0.25) * 0.12;
      }
    }
    if (inner.current) {
      const k = s * (1 + energy.current * 0.3 + (reducedMotion ? 0 : Math.sin(t * 1.8) * 0.025));
      inner.current.scale.setScalar(k);
    }
  });

  return (
    <group position={[0, 1.5, 0]}>
      <mesh ref={inner} castShadow>
        <icosahedronGeometry args={[0.62, 1]} />
        <meshStandardMaterial color="#3a2c12" emissive={rankColor} emissiveIntensity={1.35} roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh ref={shell} scale={1.5}>
        <octahedronGeometry args={[0.62, 0]} />
        <meshPhysicalMaterial
          color="#cfe4d8"
          transparent
          opacity={0.32}
          roughness={0.12}
          metalness={0}
          clearcoat={1}
          emissive={rankColor}
          emissiveIntensity={0.25}
        />
      </mesh>
      {[2.2, 2.75].map((r, i) => (
        <mesh key={r} rotation={[Math.PI / 2.15 + i * 0.28, 0.2 * i, 0]}>
          <torusGeometry args={[r * 0.62, 0.018, 12, 90]} />
          <meshBasicMaterial color={i === 0 ? "#f4d06f" : "#72e6d1"} transparent opacity={0.5} />
        </mesh>
      ))}
      {level >= 6 && (
        <mesh rotation={[Math.PI / 1.8, -0.3, 0]}>
          <torusGeometry args={[1.85, 0.014, 12, 90]} />
          <meshBasicMaterial color="#a98be8" transparent opacity={0.45} />
        </mesh>
      )}
    </group>
  );
}

// Floating rock cone beneath the island meadow.
function Island() {
  return (
    <group position={[0, 0, 0]}>
      {/* meadow top */}
      <mesh position={[0, 0.28, 0]} receiveShadow>
        <cylinderGeometry args={[3.6, 3.3, 0.35, 40]} />
        <meshStandardMaterial color="#2c6b52" roughness={0.9} metalness={0} />
      </mesh>
      {/* pale terrace ring */}
      <mesh position={[0, 0.47, 0]} receiveShadow>
        <cylinderGeometry args={[1.35, 1.35, 0.06, 40]} />
        <meshStandardMaterial color="#a8b39a" roughness={0.85} metalness={0} />
      </mesh>
      {/* rock underside */}
      <mesh position={[0, -1.5, 0]}>
        <coneGeometry args={[3.3, 3.4, 7]} />
        <meshStandardMaterial color="#3d3a52" roughness={0.95} metalness={0.05} flatShading />
      </mesh>
      {/* hanging crystal */}
      <mesh position={[0.4, -3.1, 0.3]}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color="#14202e" emissive="#72e6d1" emissiveIntensity={1.2} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Observatory() {
  const stone = "#8d89a0";
  return (
    <group position={[-2.2, 0.45, -1.4]} rotation={[0, 0.5, 0]}>
      {/* arch */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <torusGeometry args={[0.85, 0.13, 12, 24, Math.PI]} />
        <meshStandardMaterial color={stone} roughness={0.85} />
      </mesh>
      {[[-0.85, 0.55], [0.85, 0.55]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 1.1, 10]} />
          <meshStandardMaterial color={stone} roughness={0.85} />
        </mesh>
      ))}
      {/* telescope */}
      <mesh position={[1.15, 1.35, 0.1]} rotation={[0.15, 0, -0.85]} castShadow>
        <cylinderGeometry args={[0.07, 0.11, 0.7, 12]} />
        <meshStandardMaterial color="#5a6b8c" roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0.82, 1.02, 0.1]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.5, 10]} />
        <meshStandardMaterial color={stone} roughness={0.85} />
      </mesh>
      {/* bridge to a side islet */}
      <mesh position={[2.6, 0.1, 1.1]} rotation={[0, -0.5, 0]} castShadow>
        <boxGeometry args={[2.4, 0.1, 0.7]} />
        <meshStandardMaterial color="#7a5c44" roughness={0.9} />
      </mesh>
      <mesh position={[3.9, -0.5, 1.7]}>
        <dodecahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color="#3d3a52" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[3.9, 0.25, 1.7]} castShadow>
        <coneGeometry args={[0.4, 0.9, 8]} />
        <meshStandardMaterial color="#2c6b52" roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

function Grove({ blooms, reducedMotion }) {
  const trees = useMemo(() => {
    const spots = [
      [-1.4, -2.2, 0.9], [1.8, -1.8, 1.1], [2.4, 1.2, 0.8], [-2.5, 0.8, 1.0], [0.4, 2.6, 0.7],
    ];
    return spots;
  }, []);
  const buds = Math.min(Math.max(0, blooms), 18);
  return (
    <group>
      {trees.map(([x, z, s], i) => (
        <group key={i} position={[x, 0.45, z]}>
          <mesh position={[0, 0.25 * s, 0]} castShadow>
            <cylinderGeometry args={[0.07 * s, 0.1 * s, 0.5 * s, 8]} />
            <meshStandardMaterial color="#6b4f38" roughness={0.9} />
          </mesh>
          <mesh position={[0, (0.5 + 0.35) * s, 0]} castShadow>
            <coneGeometry args={[0.42 * s, 0.9 * s, 8]} />
            <meshStandardMaterial color={i % 2 ? "#2c6b52" : "#35966f"} roughness={0.85} flatShading />
          </mesh>
        </group>
      ))}
      {/* luminous blooms earned through completed quests */}
      {Array.from({ length: buds }).map((_, i) => {
        const a = (i / 18) * Math.PI * 2;
        const r = 2.2 + (i % 3) * 0.35;
        const palette = ["#ee7d6d", "#f4d06f", "#a98be8", "#72e6d1"];
        return (
          <group key={`b${i}`} position={[Math.cos(a) * r, 0.62, Math.sin(a) * r]}>
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
              <meshStandardMaterial color="#3f7a5f" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.24, 0]}>
              <icosahedronGeometry args={[0.09, 0]} />
              <meshStandardMaterial
                color="#1a2433"
                emissive={palette[i % palette.length]}
                emissiveIntensity={1.8}
                roughness={0.4}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Six biome pads; pads with active quests grow a crystal cluster.
function BiomePads({ counts }) {
  return (
    <group>
      {BIOMES.map((b, i) => {
        const [x, y, z] = padPosition(b.attr);
        const n = Math.min(counts[b.attr] || 0, 3);
        return (
          <group key={b.attr} position={[x, y - 0.15, z]}>
            <mesh receiveShadow>
              <cylinderGeometry args={[0.42, 0.5, 0.1, 20]} />
              <meshStandardMaterial color="#223148" emissive={b.color} emissiveIntensity={0.35} roughness={0.6} />
            </mesh>
            {Array.from({ length: n }).map((_, k) => (
              <mesh key={k} position={[(k - (n - 1) / 2) * 0.22, 0.28, 0]} castShadow>
                <octahedronGeometry args={[0.11, 0]} />
                <meshStandardMaterial color="#101c2c" emissive={b.color} emissiveIntensity={1.5} roughness={0.35} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

function QuestNodes({ nodes, onHover, onSelect, interactive, paused }) {
  const group = useRef();
  const [hovered, setHovered] = useState(null);
  useFrame((_, dt) => {
    if (!paused && group.current) group.current.rotation.y += dt * 0.1;
  });
  const placed = useMemo(() => {
    const n = Math.min(nodes.length, 8);
    return nodes.slice(0, 8).map((node, i) => ({
      node,
      angle: (i / Math.max(1, n)) * Math.PI * 2,
    }));
  }, [nodes]);

  return (
    <group ref={group} position={[0, 1.5, 0]}>
      {placed.map(({ node, angle }) => {
        const x = Math.cos(angle) * 2.45;
        const z = Math.sin(angle) * 2.45;
        const isHover = hovered === node.id;
        return (
          <mesh
            key={node.id}
            position={[x, Math.sin(angle * 2) * 0.3, z]}
            scale={isHover ? 1.55 : 1}
            castShadow
            onPointerOver={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              setHovered(node.id);
              onHover?.(node);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              setHovered(null);
              onHover?.(null);
              document.body.style.cursor = "";
            }}
            onClick={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              onSelect?.(node);
            }}
          >
            <octahedronGeometry args={[0.18, 0]} />
            <meshStandardMaterial
              color="#101c2c"
              emissive={node.color}
              emissiveIntensity={isHover ? 3 : 1.4}
              roughness={0.35}
              metalness={0.4}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Energy wisp: flies from a biome pad into the heart, then bursts.
function Wisp({ from, color, onArrive }) {
  const ref = useRef();
  const t = useRef(0);
  const done = useRef(false);
  const target = useMemo(() => new THREE.Vector3(0, 1.5, 0), []);
  const start = useMemo(() => new THREE.Vector3(from[0], from[1] + 0.4, from[2]), [from]);
  useFrame((_, dt) => {
    if (done.current || !ref.current) return;
    t.current += dt / 0.9;
    const k = Math.min(1, t.current);
    const e = 1 - Math.pow(1 - k, 3);
    ref.current.position.lerpVectors(start, target, e);
    ref.current.position.y += Math.sin(k * Math.PI) * 0.6;
    const s = 0.8 + Math.sin(k * 20) * 0.15;
    ref.current.scale.setScalar(Math.max(0.05, s * (1 - k * 0.4)));
    if (k >= 1) {
      done.current = true;
      onArrive?.();
    }
  });
  return (
    <mesh ref={ref} position={start}>
      <sphereGeometry args={[0.12, 14, 14]} />
      <meshBasicMaterial color={color} transparent opacity={0.95} />
    </mesh>
  );
}

function Rig({ reducedMotion, interactive, focus }) {
  const { camera, gl } = useThree();
  const [fx, fy, fz] = focus;
  useEffect(() => {
    camera.position.set(fx, 2.1, 8.2);
    camera.lookAt(fx, fy, fz);
    const el = gl.domElement;
    const onMove = (e) => {
      if (reducedMotion || !interactive) return;
      const r = el.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
      camera.position.x += ((fx + nx * 0.8) - camera.position.x) * 0.035;
      camera.position.y += (((2.1 - ny * 0.55)) - camera.position.y) * 0.035;
      camera.lookAt(fx, fy, fz);
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [camera, gl, reducedMotion, interactive, fx, fy, fz]);
  return null;
}

// Native hover listener on the real canvas element: slows chamber time so
// orbiting nodes can be inspected precisely. (R3F Canvas does not reliably
// forward DOM hover props, so this bypasses that entirely.)
function PauseOnHover({ onChange }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    const over = () => onChange(true);
    const out = () => onChange(false);
    el.addEventListener("pointerover", over);
    el.addEventListener("pointerout", out);
    return () => {
      el.removeEventListener("pointerover", over);
      el.removeEventListener("pointerout", out);
    };
  }, [gl, onChange]);
  return null;
}

// The living atlas. Render client-side only via dynamic import.
export function PowerCoreScene({
  level = 1,
  progress = 0,
  rankColor = "#F4D06F",
  accent = "#8FA8F8",
  mood = "dawn",
  nodes = [],
  biomeCounts = {},
  blooms = 0,
  artifacts = 0,
  pulse = 0,
  transfer = null,
  onTransferDone,
  interactive = true,
  reducedMotion = false,
  dense = true,
  onNodeHover,
  onNodeSelect,
  focus = [0, 1, 0],
  autoRotate = true,
}) {
  const [paused, setPaused] = useState(false);
  const m = MOODS[mood] || MOODS.dawn;
  return (
    <Canvas
      shadows={!reducedMotion && dense ? "percentage" : false}
      dpr={dense ? [1, 1.75] : [1, 1.25]}
      camera={{ position: [0, 2.1, 8.2], fov: 40 }}
      gl={{ antialias: true, alpha: false }}
      aria-hidden="true"
    >
      <PauseOnHover onChange={setPaused} />
      <color attach="background" args={[m.bg]} />
      <fog attach="fog" args={[m.bg, 11, 24]} />
      <hemisphereLight args={[m.hemiSky, m.hemiGround, 0.55]} />
      <directionalLight
        position={[5, 8, 4]}
        intensity={m.keyI}
        color={m.key}
        castShadow={!reducedMotion && dense}
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-5, 3, -3]} color="#8fa8f8" intensity={10} distance={18} />
      <pointLight position={[0, 3.4, 0]} color={rankColor} intensity={6} distance={9} />
      <BurstLight pulse={pulse} color="#f4d06f" />

      <Island />
      <Observatory />
      <Grove blooms={blooms} reducedMotion={reducedMotion} />
      <BiomePads counts={biomeCounts} />
      <AetherHeart level={level} progress={progress} rankColor={rankColor} pulse={pulse} reducedMotion={reducedMotion} />
      <QuestNodes nodes={nodes} onHover={onNodeHover} onSelect={onNodeSelect} interactive={interactive} paused={paused} />
      {transfer && (
        <Wisp
          key={transfer.key}
          from={transfer.from}
          color={transfer.color || "#f4d06f"}
          onArrive={onTransferDone}
        />
      )}

      {/* cloud sea + reflection */}
      {dense && (
        <Cloud segments={10} bounds={[9, 2.5, 5]} volume={16} color="#cfd9ea" opacity={0.2} speed={0.12} position={[0, -3.2, -5]} />
      )}
      {dense ? (
        <mesh position={[0, -4.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[11, 48]} />
          <MeshReflectorMaterial
            blur={[260, 70]}
            resolution={512}
            mixBlur={1}
            mixStrength={7}
            roughness={0.92}
            depthScale={1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#0d1626"
            metalness={0.5}
            mirror={0.55}
          />
        </mesh>
      ) : (
        <mesh position={[0, -4.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[11, 40]} />
          <meshStandardMaterial color="#0d1626" roughness={0.9} metalness={0.2} />
        </mesh>
      )}

      <Stars radius={46} depth={20} count={dense ? 1500 : 400} factor={3.2} saturation={0} fade speed={reducedMotion ? 0 : 0.5} />
      {!reducedMotion && (
        <Sparkles count={dense ? 70 : 24} scale={[10, 5, 8]} position={[0, 2, 0]} size={2.4} speed={0.25} color="#72e6d1" opacity={0.55} />
      )}
      {!reducedMotion && (
        <Sparkles count={dense ? 40 : 14} scale={[9, 4, 7]} position={[0, 1.4, 0]} size={3} speed={0.18} color="#f4d06f" opacity={0.5} />
      )}

      <Rig reducedMotion={reducedMotion} interactive={interactive} focus={focus} />
      {interactive && !reducedMotion && (
        <OrbitControls
          target={focus}
          enableZoom={false}
          enablePan={false}
          autoRotate={!paused && autoRotate}
          autoRotateSpeed={0.5}
          minPolarAngle={1.0}
          maxPolarAngle={1.62}
          enableDamping
        />
      )}
    </Canvas>
  );
}

// Resize helper for parents that need to know small screens.
export function useSmallScreen(breakpoint = 700) {
  const [small, setSmall] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    function onResize() {
      setSmall(window.innerWidth < breakpoint);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return small;
}

export const THREE_CHAMBER_HEIGHT = { desktop: 420, mobile: 300 };
