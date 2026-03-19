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
  uniform vec2 uResolution;
  varying vec2 vUv;

  // Simple noise function
  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    p.x *= uResolution.x / uResolution.y;

    float t = uTime * 0.2;
    
    // Create organic morphing blobs using sine waves and noise
    float d = length(p);
    float blob1 = sin(p.x * 2.0 + t) * cos(p.y * 1.5 - t * 0.8) * 0.5 + 0.5;
    float blob2 = sin(p.y * 2.5 - t * 1.2) * cos(p.x * 1.8 + t * 0.5) * 0.5 + 0.5;
    
    vec3 color1 = vec4(0.02, 0.04, 0.1, 1.0).rgb; // Deep Navy
    vec3 color2 = vec4(0.05, 0.7, 0.8, 1.0).rgb;  // Cyan
    vec3 color3 = vec4(0.6, 0.3, 0.9, 1.0).rgb;  // Purple
    vec3 color4 = vec4(0.9, 0.2, 0.6, 1.0).rgb;  // Magenta

    vec3 finalColor = mix(color1, color2, blob1 * 0.2);
    finalColor = mix(finalColor, color3, blob2 * 0.15);
    finalColor = mix(finalColor, color4, (1.0 - d) * 0.1);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export function ShaderBackground() {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  }), []);

  useFrame((state) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -10]}>
      <planeGeometry args={[100, 100]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
