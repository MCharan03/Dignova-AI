'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uStress;
  uniform vec2 uResolution;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    p.x *= uResolution.x / uResolution.y;

    float t = uTime * (0.2 + uStress * 0.5);
    
    // Neural Breathing Logic
    float pulse = sin(uTime * (1.0 + uStress * 2.0)) * 0.1;
    float d = length(p) + pulse;
    float blob1 = sin(p.x * 2.0 + t) * cos(p.y * 1.5 - t * 0.8) * 0.5 + 0.5;
    float blob2 = sin(p.y * 2.5 - t * 1.2) * cos(p.x * 1.8 + t * 0.5) * 0.5 + 0.5;
    
    vec3 color1 = vec3(0.02, 0.04, 0.1); // Deep Navy
    vec3 calmColor = vec3(0.05, 0.7, 0.8); // Cyan
    vec3 stressColor = vec3(0.9, 0.1, 0.1); // Alert Red
    
    vec3 baseColor = mix(calmColor, stressColor, uStress);
    vec3 accentColor = mix(vec3(0.6, 0.3, 0.9), vec3(0.5, 0.0, 0.0), uStress);

    vec3 finalColor = mix(color1, baseColor, blob1 * 0.2);
    finalColor = mix(finalColor, accentColor, blob2 * 0.15);
    finalColor = mix(finalColor, vec3(0.9, 0.2, 0.6), (1.0 - d) * 0.1);

    gl_FragColor = vec4(finalColor, 0.8);
  }
`;

export function ShaderBackground() {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uStress: { value: 0 },
    uResolution: { value: new THREE.Vector2(typeof window !== 'undefined' ? window.innerWidth : 1920, typeof window !== 'undefined' ? window.innerHeight : 1080) }
  }), []);

  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = state.clock.elapsedTime;
      
      // Pull Sentient Telemetry from CSS Variable
      if (typeof document !== 'undefined') {
        const stress = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sentient-stress') || '0');
        mat.uniforms.uStress.value = THREE.MathUtils.lerp(mat.uniforms.uStress.value, stress, 0.05);
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -50]}>
      <planeGeometry args={[200, 200]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        depthTest={true}
      />
    </mesh>
  );
}
