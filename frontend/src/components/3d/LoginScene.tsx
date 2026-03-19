'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial, Environment, Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

type Props = {
  isRegistering: boolean;
  isTransitioning: boolean;
  role: 'user' | 'doctor';
};

export function LoginScene({ isRegistering, isTransitioning, role }: Props) {
  const monolithRef = useRef<THREE.Mesh>(null);
  const ringGroupRef = useRef<THREE.Group>(null);
  const cameraRef = useRef(new THREE.Vector3());

  // Dynamic colors based on role
  const glowColor = role === 'doctor' ? new THREE.Color('#10b981') : new THREE.Color('#a855f7'); 
  const ringColor = role === 'doctor' ? '#34d399' : '#c084fc';

  useFrame((state, delta) => {
    // 1. Monolith rotation
    if (monolithRef.current) {
      monolithRef.current.rotation.y += delta * 0.1;
      monolithRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }

    // 2. Ring rotation
    if (ringGroupRef.current) {
      ringGroupRef.current.rotation.z -= delta * 0.05;
      ringGroupRef.current.rotation.x += delta * 0.02;
    }

    // 3. Smooth Camera Positioning
    const tCamera = state.camera as THREE.PerspectiveCamera;
    if (!tCamera) return;

    if (isTransitioning) {
      // THE PORTAL DIVE
      tCamera.position.z = THREE.MathUtils.lerp(tCamera.position.z, -20, delta * 3);
    } else {
      // Normal state transitions (Login vs Register)
      const targetX = isRegistering ? -4 : 4;
      const targetZ = isRegistering ? 12 : 14;
      
      // Slight mouse tracking
      const mouseX = (state.pointer.x * state.viewport.width) / 5;
      const mouseY = (state.pointer.y * state.viewport.height) / 5;
      
      cameraRef.current.set(targetX + mouseX * 0.2, mouseY * 0.2, targetZ);
      tCamera.position.lerp(cameraRef.current, delta * 2);

      // Look roughly at center
      tCamera.lookAt(0, 0, 0);
    }
  });

  // Geometry memorization for performance
  const ringGeom = useMemo(() => new THREE.TorusGeometry(8, 0.02, 16, 100), []);
  const innerRingGeom = useMemo(() => new THREE.TorusGeometry(6, 0.01, 16, 100), []);

  return (
    <>
      <color attach="background" args={['#020205']} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {/* Dynamic glow light behind the monolith */}
      <pointLight position={[0, 0, -2]} intensity={isTransitioning ? 50 : 5} distance={20} color={glowColor} />

      <Environment preset="city" />
      <Stars radius={100} depth={100} count={10000} factor={7} saturation={0} fade speed={isTransitioning ? 10 : 2} />
      <Sparkles count={500} scale={120} size={6} speed={0.4} opacity={1} color="#fff" />

      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <group>
          {/* Main Dark Monolith */}
          <mesh ref={monolithRef}>
            <octahedronGeometry args={[4, 0]} />
            <MeshTransmissionMaterial 
              backside
              thickness={2}
              roughness={0.1}
              transmission={1}
              ior={1.5}
              chromaticAberration={0.4}
              anisotropy={0.3}
              color="#2a2a35"
            />
          </mesh>

          {/* Internal core floating element */}
          <mesh scale={0.5}>
            <dodecahedronGeometry args={[2, 0]} />
            <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={2} wireframe />
          </mesh>
        </group>
      </Float>

      {/* Orbiting wireframe rings */}
      <group ref={ringGroupRef}>
        <mesh geometry={ringGeom}>
          <meshBasicMaterial color={ringColor} transparent opacity={0.2} />
        </mesh>
        <mesh geometry={innerRingGeom} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color={ringColor} transparent opacity={0.4} />
        </mesh>
      </group>
    </>
  );
}

