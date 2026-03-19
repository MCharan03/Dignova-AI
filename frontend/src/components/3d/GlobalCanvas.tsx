'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { SceneController } from './SceneController';
import { ShaderBackground } from './ShaderBackground';
import { Environment, ScrollControls } from '@react-three/drei';

export function GlobalCanvas() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ 
          antialias: true, 
          alpha: false, 
          powerPreference: "high-performance"
        }}
      >
        <color attach="background" args={['#020205']} />
        
        <Suspense fallback={null}>
          <ShaderBackground />
          <Environment preset="city" />
          {/* ScrollControls with high damping for that Apple-smooth feel */}
          <ScrollControls pages={6} damping={0.2} infinite={false}>
            <SceneController />
          </ScrollControls>
        </Suspense>
      </Canvas>
    </div>
  );
}
