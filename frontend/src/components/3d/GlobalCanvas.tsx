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
  const [contextLost, setContextLost] = useState(false);
  const { survivorMode } = useNetworkResilience();
  
  useEffect(() => {
    setMounted(true);
    if (!isWebGLAvailable()) {
      console.warn("WebGL not available. 3D background disabled.");
      setHasWebGL(false);
    }
  }, []);

  // Recover from WebGL context loss (happens when GPU is exhausted or user switches tabs)
  const handleContextLost = (e: Event) => {
    e.preventDefault();
    console.warn('[GlobalCanvas] WebGL context lost. Will recover on restore.');
    setContextLost(true);
  };
  const handleContextRestored = () => {
    console.log('[GlobalCanvas] WebGL context restored.');
    setContextLost(false);
  };

  if (!mounted || !hasWebGL || survivorMode || contextLost) return null;

  return (
    <Canvas
      camera={{ position: [0, 0, 15], fov: 50 }}
      dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 1.5) : 1}
      frameloop="demand"
      gl={{ 
        antialias: false,
        alpha: true, 
        stencil: false,
        depth: true,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false,
      }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', handleContextLost);
        gl.domElement.addEventListener('webglcontextrestored', handleContextRestored);
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

