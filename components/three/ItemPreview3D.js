"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef } from "react";

// Interactive vault item preview: real geometry per item type.
// Rotate with drag; auto-rotates gently. Respects reduced motion.
function ItemMesh({ kind, color }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.7;
  });
  const mat = (
    <meshStandardMaterial color="#101724" emissive={color} emissiveIntensity={1.1} roughness={0.35} metalness={0.55} />
  );
  if (kind === "frame") {
    return (
      <mesh ref={ref}>
        <torusGeometry args={[0.62, 0.12, 18, 44]} />
        {mat}
      </mesh>
    );
  }
  if (kind === "title") {
    return (
      <mesh ref={ref}>
        <octahedronGeometry args={[0.72, 0]} />
        {mat}
      </mesh>
    );
  }
  if (kind === "theme") {
    return (
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.66, 1]} />
        {mat}
      </mesh>
    );
  }
  if (kind === "ghost") {
    return (
      <mesh ref={ref}>
        <sphereGeometry args={[0.6, 20, 20]} />
        <meshStandardMaterial color="#101724" emissive={color} emissiveIntensity={0.9} roughness={0.4} metalness={0.4} wireframe />
      </mesh>
    );
  }
  // aura default: energy knot
  return (
    <mesh ref={ref} scale={0.62}>
      <torusKnotGeometry args={[0.55, 0.18, 90, 12]} />
      {mat}
    </mesh>
  );
}

export function ItemPreview3D({ kind = "aura", color = "#45b8f0", reducedMotion = false }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.4, 3.1], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.55} />
      <pointLight position={[2.5, 2.5, 2.5]} intensity={14} color={color} distance={12} />
      <pointLight position={[-2, -1, 2]} intensity={5} color="#ffffff" distance={10} />
      <ItemMesh kind={kind} color={color} />
      {!reducedMotion && (
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.4} />
      )}
    </Canvas>
  );
}
