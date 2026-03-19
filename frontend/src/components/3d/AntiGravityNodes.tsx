'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ─── GLASS CORE ORB ───────────────────────────────────────────────────────────
function GlassCoreOrb() {
  const orbRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  let scroll: any;
  try {
    scroll = useScroll();
  } catch (e) {
    scroll = { offset: 0 };
  }

  useFrame((state) => {
    if (!orbRef.current || !innerRef.current) return;
    const t = state.clock.elapsedTime;
    const s = scroll.offset || 0;

    // Mouse-based tilt
    const mx = state.pointer.x;
    const my = state.pointer.y;
    orbRef.current.rotation.y += (mx * 0.4 - orbRef.current.rotation.y) * 0.04;
    orbRef.current.rotation.x += (-my * 0.2 - orbRef.current.rotation.x) * 0.04;

    // Scroll: rise from below to center, then float behind content
    orbRef.current.position.y = -1.2 + s * 4;
    orbRef.current.position.z = -0.5 - s * 3;

    // Inner pulse heartbeat
    const pulse = 0.3 + Math.abs(Math.sin(t * 1.4)) * 0.15;
    innerRef.current.scale.setScalar(pulse);
  });

  return (
    <group ref={orbRef} position={[0, -1.2, -0.5]}>
      {/* Outer glass transmission sphere — MASSIVE centerpiece */}
      <mesh>
        <sphereGeometry args={[2.5, 64, 64]} />
        <MeshTransmissionMaterial
          backside
          samples={6}
          thickness={0.8}
          roughness={0.04}
          transmission={0.97}
          ior={1.5}
          chromaticAberration={0.08}
          attenuationColor="#06b6d4"
          attenuationDistance={0.6}
          color="#020818"
          temporalDistortion={0.1}
          distortionScale={0.2}
        />
      </mesh>

      {/* Inner glowing core — the "beating heart" */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.85, 32, 32]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={6}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Thin inner ring 1 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.02, 12, 120]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={3} metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Thin inner ring 2 — tilted */}
      <mesh rotation={[Math.PI / 3, Math.PI / 6, 0]}>
        <torusGeometry args={[1.85, 0.015, 12, 120]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2} metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

// ─── GLASS ARCH RINGS (iertqa-inspired sweep arcs) ───────────────────────────
function GlassArcs() {
  const groupRef = useRef<THREE.Group>(null);
  let scroll: any;
  try {
    scroll = useScroll();
  } catch (e) {
    scroll = { offset: 0 };
  }

  const arcGeos = useMemo(() => {
    return [0, 1, 2].map(i => {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-2.5 - i * 0.4, -4 + i * 0.2, 0),
        new THREE.Vector3(0, -1 + i * 0.3, -0.5),
        new THREE.Vector3(2.5 + i * 0.4, -4 + i * 0.2, 0)
      );
      return new THREE.TubeGeometry(curve, 80, 0.022 - i * 0.004, 8, false);
    });
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const s = scroll.offset;
    const t = state.clock.elapsedTime;
    // Rise upward with scroll
    groupRef.current.position.y = -1 + s * 4;
    groupRef.current.position.z = -2 - s;
    // Gentle sway
    groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.03;
  });

  const arcColors = ['#06b6d4', '#3b82f6', '#a855f7'];

  return (
    <group ref={groupRef}>
      {arcGeos.map((geo, i) => (
        <mesh key={i} geometry={geo}>
          <meshStandardMaterial
            color={arcColors[i]}
            emissive={arcColors[i]}
            emissiveIntensity={2 - i * 0.3}
            metalness={0.95}
            roughness={0.05}
            transparent
            opacity={0.85 - i * 0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── FLOATING DATA FRAGMENTS (minimal — just 6 small glass shards) ────────────
function DataFragments() {
  const refs = useRef<THREE.Mesh[]>([]);

  const fragments = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      pos: [
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4 - 3,
      ] as [number, number, number],
      rot: [Math.random() * Math.PI, Math.random() * Math.PI, 0] as [number, number, number],
      scale: 0.08 + Math.random() * 0.12,
      speed: 0.2 + Math.random() * 0.4,
      offset: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const f = fragments[i];
      mesh.rotation.x = t * f.speed * 0.5 + f.offset;
      mesh.rotation.y = t * f.speed * 0.3;
      mesh.position.y = f.pos[1] + Math.sin(t * f.speed + f.offset) * 0.3;
    });
  });

  return (
    <group>
      {fragments.map((f, i) => (
        <mesh key={i} position={f.pos} rotation={f.rot} scale={f.scale}
          ref={(el) => { if (el) refs.current[i] = el; }}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#06b6d4"
            emissive="#06b6d4"
            emissiveIntensity={1}
            metalness={0.8}
            roughness={0.1}
            transparent
            opacity={0.5}
            wireframe
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── SOFT AMBIENT LIGHT BLOBS (CSS-matched with 3D lighting) ─────────────────
function AtmosphericLights() {
  const l1 = useRef<THREE.PointLight>(null);
  const l2 = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (l1.current) {
      l1.current.position.x = Math.sin(t * 0.3) * 4;
      l1.current.position.y = Math.cos(t * 0.2) * 2;
    }
    if (l2.current) {
      l2.current.position.x = -Math.sin(t * 0.25) * 5;
      l2.current.position.y = Math.cos(t * 0.35) * 3;
    }
  });

  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight ref={l1} position={[3, 2, 2]} intensity={8} color="#06b6d4" distance={12} decay={2} />
      <pointLight ref={l2} position={[-4, -2, 1]} intensity={5} color="#3b82f6" distance={10} decay={2} />
      <pointLight position={[0, 4, 3]} intensity={3} color="#a855f7" distance={8} decay={2} />
      {/* Rim light from below — key to the iertqa glass look */}
      <pointLight position={[0, -6, 0]} intensity={4} color="#06b6d4" distance={15} decay={1.5} />
      <directionalLight position={[2, 5, 4]} intensity={0.5} color="#ffffff" />
    </>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export function AntiGravityNodes() {
  return (
    <>
      <AtmosphericLights />
      <GlassCoreOrb />
      <GlassArcs />
      <DataFragments />
    </>
  );
}

