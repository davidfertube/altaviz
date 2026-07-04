"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Float,
  Lightformer,
  MeshTransmissionMaterial,
} from "@react-three/drei";
import * as THREE from "three";

/**
 * The hero centerpiece: a faceted glass gem, blue-tinted, slowly rotating and
 * tilting toward the cursor. Environment is built from Lightformers so no
 * external HDR is fetched. Rendered client-only via next/dynamic.
 */

function Gem({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const target = useRef({ x: 0, y: 0 });

  const geometry = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1.35, 0);
    return g;
  }, []);

  useFrame(({ pointer }, delta) => {
    if (!group.current) return;
    if (!reduced) {
      group.current.rotation.y += delta * 0.25;
      target.current.x = pointer.y * 0.35;
      target.current.y = pointer.x * 0.45;
      group.current.rotation.x = THREE.MathUtils.lerp(
        group.current.rotation.x,
        target.current.x,
        0.06,
      );
      group.current.rotation.z = THREE.MathUtils.lerp(
        group.current.rotation.z,
        -target.current.y * 0.3,
        0.06,
      );
    }
  });

  return (
    <Float
      speed={reduced ? 0 : 1.4}
      rotationIntensity={reduced ? 0 : 0.25}
      floatIntensity={reduced ? 0 : 0.9}
    >
      <group ref={group}>
        <mesh geometry={geometry}>
          <MeshTransmissionMaterial
            transmission={1}
            thickness={1.6}
            roughness={0.12}
            ior={1.45}
            chromaticAberration={0.045}
            anisotropicBlur={0.25}
            distortion={0.12}
            distortionScale={0.4}
            temporalDistortion={0.06}
            color="#dbe4ff"
            attenuationColor="#2e4dff"
            attenuationDistance={2.4}
          />
        </mesh>
        {/* inner core gives the glass something to refract */}
        <mesh scale={0.42}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial
            color="#2e4dff"
            roughness={0.25}
            metalness={0.35}
            emissive="#1a2ecc"
            emissiveIntensity={0.35}
          />
        </mesh>
      </group>
    </Float>
  );
}

export default function HeroGlass() {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 5.2], fov: 40 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
      aria-label="Rotating faceted glass gem"
    >
      <Suspense fallback={null}>
        <Gem reduced={reduced} />
        <Environment resolution={256}>
          <Lightformer intensity={2.5} position={[4, 3, 4]} scale={[6, 4, 1]} color="#ffffff" />
          <Lightformer intensity={1.6} position={[-5, -1, 3]} scale={[5, 3, 1]} color="#b9c6ff" />
          <Lightformer intensity={1.2} position={[0, 5, -4]} scale={[8, 3, 1]} color="#e8ecff" />
          <Lightformer intensity={0.8} position={[0, -4, 2]} scale={[6, 2, 1]} color="#2e4dff" />
        </Environment>
        <ambientLight intensity={0.35} />
      </Suspense>
    </Canvas>
  );
}
