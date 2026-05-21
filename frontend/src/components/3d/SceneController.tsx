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
  const [loginState, setLoginState] = React.useState({ isRegistering: false, isTransitioning: false, role: 'user' as 'user' | 'doctor' });

  React.useEffect(() => {
    const handleState = (e: any) => setLoginState(e.detail);
    window.addEventListener('dignova_login_state', handleState);
    return () => window.removeEventListener('dignova_login_state', handleState);
  }, []);
  
  // Transitions
  const targetPosition = useMemo(() => new THREE.Vector3(0, 0, 15), []);
  const targetLookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  
  useFrame((state, delta) => {
    // Skip camera control if in LoginScene (LoginScene handles its own camera)
    if (pathname === '/login') return;

    // 1. Determine target camera settings based on route
    if (pathname === '/') {
      targetPosition.set(0, 0, 15);
    } else {
      // Dashboard/Others
      targetPosition.set(0, 0, 18);
    }

    // 2. Smoothly lerp camera (Apple-style damping)
    state.camera.position.lerp(targetPosition, delta * 2);
    
    // 3. Smoothly look at target
    state.camera.lookAt(0, 0, 0);
  });

  // Render components based on route
  const isDashboard = pathname.startsWith('/admin') || pathname.startsWith('/doctor') || pathname.startsWith('/user');
  const isAuthMisc = pathname === '/forgot-password' || pathname === '/reset-password' || pathname === '/verify';

  return (
    <>
      {pathname === '/' && <AntiGravityNodes />}
      {pathname === '/login' && (
        <BackgroundScene />
      )}
      {(isDashboard || isAuthMisc) && (
        <BackgroundScene /> 
      )}
    </>
  );
}
