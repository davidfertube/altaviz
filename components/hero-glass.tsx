"use client";

import { Component, type ReactNode, Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Float,
  Lightformer,
  MeshTransmissionMaterial,
  RoundedBox,
} from "@react-three/drei";
import * as THREE from "three";
import GemPlaceholder from "./gem-placeholder";

/**
 * Morpho-style hero: a fanned stack of frosted-glass rounded panes, blue-lit,
 * floating with slow rotation and cursor parallax. Lightformer environment —
 * no external HDR fetch. Falls back to the static placeholder while loading,
 * without WebGL, or if the canvas throws.
 */

const PANES: { pos: [number, number, number]; rotZ: number; scale: number }[] = [
  { pos: [-0.34, -0.3, -0.7], rotZ: -0.38, scale: 1.02 },
  { pos: [0, 0, 0], rotZ: -0.08, scale: 1.06 },
  { pos: [0.36, 0.32, 0.7], rotZ: 0.26, scale: 1.0 },
];

function GlassStack({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ pointer, clock }) => {
    if (!group.current || reduced) return;
    const t = clock.elapsedTime;
    group.current.rotation.y =
      Math.sin(t * 0.22) * 0.34 + THREE.MathUtils.lerp(0, pointer.x * 0.5, 0.9);
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      -pointer.y * 0.32 + Math.sin(t * 0.17) * 0.06,
      0.05,
    );
  });

  return (
    <Float
      speed={reduced ? 0 : 1.1}
      rotationIntensity={reduced ? 0 : 0.12}
      floatIntensity={reduced ? 0 : 0.7}
    >
      <group ref={group} rotation={[0.1, 0, 0]}>
        {PANES.map((p, i) => (
          <RoundedBox
            key={i}
            args={[2.35, 2.35, 0.14]}
            radius={0.42}
            smoothness={5}
            position={p.pos}
            rotation={[0, 0, p.rotZ]}
            scale={p.scale}
          >
            <MeshTransmissionMaterial
              transmission={1}
              thickness={0.55}
              roughness={0.32}
              ior={1.42}
              chromaticAberration={0.025}
              anisotropicBlur={0.4}
              color="#e8edff"
              attenuationColor="#2e4dff"
              attenuationDistance={1.6}
            />
          </RoundedBox>
        ))}
        {/* small satellite pane drifting behind the stack */}
        <RoundedBox
          args={[0.8, 0.8, 0.1]}
          radius={0.18}
          smoothness={4}
          position={[1.75, -1.05, -1.3]}
          rotation={[0.2, 0.4, 0.5]}
        >
          <MeshTransmissionMaterial
            transmission={1}
            thickness={0.4}
            roughness={0.35}
            ior={1.42}
            color="#e8edff"
            attenuationColor="#2e4dff"
            attenuationDistance={1.4}
          />
        </RoundedBox>
      </group>
    </Float>
  );
}

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <GemPlaceholder /> : this.props.children;
  }
}

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function HeroGlass() {
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(webglAvailable()));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (ready === null || ready === false) return <GemPlaceholder />;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <CanvasBoundary>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 6.4], fov: 36 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
        aria-label="Floating stack of frosted glass panes"
      >
        <Suspense fallback={null}>
          <GlassStack reduced={reduced} />
          <Environment resolution={256}>
            <Lightformer intensity={2.6} position={[4, 3, 4]} scale={[6, 4, 1]} color="#ffffff" />
            <Lightformer intensity={1.8} position={[-5, 0, 3]} scale={[5, 3, 1]} color="#c4d0ff" />
            <Lightformer intensity={1.3} position={[0, 5, -4]} scale={[9, 3, 1]} color="#eef1ff" />
            <Lightformer intensity={1.0} position={[0, -4, 2]} scale={[6, 2, 1]} color="#2e4dff" />
          </Environment>
          <ambientLight intensity={0.4} />
        </Suspense>
      </Canvas>
    </CanvasBoundary>
  );
}
