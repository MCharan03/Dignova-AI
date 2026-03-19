'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { SceneController } from './SceneController';
import { ShaderBackground } from './ShaderBackground';
import { Environment, ScrollControls, Scroll } from '@react-three/drei';
import { usePathname } from 'next/navigation';

export function GlobalCanvas({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isLanding = pathname === '/';

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ 
          antialias: true, 
          alpha: true, 
          powerPreference: "high-performance"
        }}
      >
        <Suspense fallback={null}>
          <ShaderBackground />
          <Environment preset="city" />
          
          {/* 
              If we are on the landing page, we use the old synchronized scroll logic (Fast 0.1 damping).
              Otherwise, we just show the background.
          */}
          {isLanding ? (
            <ScrollControls pages={6} damping={0.1} infinite={false}>
              <SceneController />
              <Scroll html style={{ width: '100vw', pointerEvents: 'auto' }}>
                {children}
              </Scroll>
            </ScrollControls>
          ) : (
            <>
              <SceneController />
              {/* For non-landing pages, the HTML is handled by the normal Next.js flow */}
            </>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
