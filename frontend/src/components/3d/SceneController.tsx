'use client';

import React, { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { usePathname } from 'next/navigation';
import * as THREE from 'three';
import { AntiGravityNodes } from './AntiGravityNodes';
import { LoginScene } from './LoginScene';
import { BackgroundScene } from './BackgroundScene'; // Note: BackgroundScene file also exports DashboardMonolith

// We will use a simplified version of the components
export function SceneController() {
  const pathname = usePathname();
  const { camera } = useThree();
  
  // Transitions
  const targetPosition = useMemo(() => new THREE.Vector3(0, 0, 15), []);
  const targetLookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  
  useFrame((state, delta) => {
    // 1. Determine target camera settings based on route
    if (pathname === '/') {
      targetPosition.set(0, 0, 10);
    } else if (pathname === '/login') {
      targetPosition.set(0, 0, 15);
    } else {
      targetPosition.set(-5, 0, 20); // Dashboard view
    }

    // 2. Smoothly lerp camera (Apple-style damping)
    state.camera.position.lerp(targetPosition, delta * 2);
    
    // 3. Smoothly look at target
    // We can't easily lerp lookAt, but we can lerp a target vector and look at it
    // For now, look at center is fine for most scenes
    state.camera.lookAt(0, 0, 0);
  });

  // Render components based on route
  const isDashboard = pathname.startsWith('/admin') || pathname.startsWith('/doctor') || pathname.startsWith('/user');
  const isAuthMisc = pathname === '/forgot-password' || pathname === '/reset-password' || pathname === '/verify';

  return (
    <>
      {pathname === '/' && <AntiGravityNodes />}
      {pathname === '/login' && <LoginScene isRegistering={false} isTransitioning={false} role="user" />}
      {(isDashboard || isAuthMisc) && (
        <BackgroundScene /> 
      )}
    </>
  );
}
