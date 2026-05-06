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
  const monolithRef = useRef<THREE.Group>(null);
  const ringGroupRef = useRef<THREE.Group>(null);
  const cameraRef = useRef(new THREE.Vector3());

  // Dynamic colors based on role
  const glowColor = role === 'doctor' ? new THREE.Color('#10b981') : new THREE.Color('#a855f7'); 
  const ringColor = role === 'doctor' ? '#34d399' : '#c084fc';

  useFrame((state, delta) => {
    // 1. Bipyramid (Octahedron) rotation & dynamic effects based on login/register state
    if (monolithRef.current) {
      // Base rotation
      monolithRef.current.rotation.y += delta * 0.15;
      monolithRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      
      // Dynamic scale/spin effect when switching
      const targetScale = isRegistering ? 1.2 : 1.0;
      monolithRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 4);
      
      // Extra spin when registering
      if (isRegistering) {
        monolithRef.current.rotation.y += delta * 0.5;
      }
    }

    // 2. Ring rotation
    if (ringGroupRef.current) {
      ringGroupRef.current.rotation.z -= delta * 0.05;
      ringGroupRef.current.rotation.x += delta * (isRegistering ? 0.08 : 0.02);
      
      const ringTargetScale = isRegistering ? 1.1 : 1.0;
      ringGroupRef.current.scale.lerp(new THREE.Vector3(ringTargetScale, ringTargetScale, ringTargetScale), delta * 3);
    }

    // 3. Smooth Camera Positioning
    const tCamera = state.camera as THREE.PerspectiveCamera;
    if (!tCamera) return;

    if (isTransitioning) {
      // THE PORTAL DIVE
      tCamera.position.z = THREE.MathUtils.lerp(tCamera.position.z, -10, delta * 3);
    } else {
      // Normal state transitions (Login vs Register)
      const targetX = isRegistering ? -3 : 3;
      const targetZ = isRegistering ? 12 : 15;
      
      // Slight mouse tracking
      const mouseX = (state.pointer.x * state.viewport.width) / 10;
      const mouseY = (state.pointer.y * state.viewport.height) / 10;
      
      cameraRef.current.set(targetX + mouseX * 0.2, mouseY * 0.2, targetZ);
      tCamera.position.lerp(cameraRef.current, delta * 2.5);

      // Look at the bipyramid
      tCamera.lookAt(0, 0, -2);
    }
  });

  // Geometry memorization for performance
  const ringGeom = useMemo(() => new THREE.TorusGeometry(8, 0.015, 16, 100), []);
  const innerRingGeom = useMemo(() => new THREE.TorusGeometry(6.5, 0.01, 16, 100), []);
  const bipyramidGeom = useMemo(() => new THREE.OctahedronGeometry(5, 0), []);

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      <pointLight position={[0, 0, -2]} intensity={isTransitioning ? 50 : (isRegistering ? 15 : 5)} distance={30} color={glowColor} />

      <Stars radius={100} depth={50} count={12000} factor={6} saturation={0} fade speed={isTransitioning ? 10 : (isRegistering ? 4 : 1.5)} />
      <Sparkles count={800} scale={150} size={4} speed={0.4} opacity={0.5} color="#fff" />

      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <group ref={monolithRef} position={[0, 0, -2]}>
          {/* Ethereal Square Bipyramid (Wireframe) */}
          <mesh geometry={bipyramidGeom}>
            <meshBasicMaterial 
              color={glowColor}
              wireframe
              transparent
              opacity={isRegistering ? 0.6 : 0.3}
            />
          </mesh>
          
          {/* Inner solid core to hide back lines slightly and give depth */}
          <mesh geometry={bipyramidGeom} scale={0.98}>
            <meshBasicMaterial color="#050508" transparent opacity={0.9} />
          </mesh>

          {/* Internal glowing core */}
          <mesh scale={0.4}>
            <octahedronGeometry args={[2, 0]} />
            <meshBasicMaterial color={glowColor} wireframe transparent opacity={0.8} />
          </mesh>
        </group>
      </Float>

      {/* Orbiting faint rings */}
      <group ref={ringGroupRef} position={[0, 0, -2]} rotation={[Math.PI / 3, Math.PI / 6, 0]}>
        <mesh geometry={ringGeom}>
          <meshBasicMaterial color={ringColor} transparent opacity={0.15} />
        </mesh>
        <mesh geometry={innerRingGeom} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color={ringColor} transparent opacity={0.25} />
        </mesh>
      </group>
    </>
  );
}

