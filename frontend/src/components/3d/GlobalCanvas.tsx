'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { SceneController } from './SceneController';
import { ShaderBackground } from './ShaderBackground';
import { Environment } from '@react-three/drei';

function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

import { useNetworkResilience } from '@/hooks/useNetworkResilience';

export function GlobalCanvas() {
  const [mounted, setMounted] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);
  const { survivorMode } = useNetworkResilience();
  
  useEffect(() => {
    setMounted(true);
    if (!isWebGLAvailable()) {
      console.warn("WebGL not available. 3D background disabled.");
      setHasWebGL(false);
    }
  }, []);

  if (!mounted || !hasWebGL || survivorMode) return null;

  return (
    <Canvas
      camera={{ position: [0, 0, 15], fov: 50 }}
      dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1}
      frameloop="always" 
      gl={{ 
        antialias: true, 
        alpha: true, 
        stencil: false,
        depth: true
      }}
    >
      <color attach="background" args={['#0A0A0B']} />
      <ambientLight intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={2.5} />
      <Suspense fallback={null}>
        <ShaderBackground />
        <SceneController />
      </Suspense>
    </Canvas>
  );
  }

