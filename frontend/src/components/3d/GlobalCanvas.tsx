'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { SceneController } from './SceneController';
import { ShaderBackground } from './ShaderBackground';
import { Environment } from '@react-three/drei';

export function GlobalCanvas() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 50 }}
        dpr={[1, 1.5]} // Performance: limit DPR on high-res screens
        gl={{ 
          antialias: true, 
          alpha: false, 
          powerPreference: "high-performance",
          stencil: false,
          depth: true
        }}
      >
        <color attach="background" args={['#020205']} />
        
        <Suspense fallback={null}>
          <ShaderBackground />
          <Environment preset="city" />
          <SceneController />
        </Suspense>
      </Canvas>
    </div>
  );
}
