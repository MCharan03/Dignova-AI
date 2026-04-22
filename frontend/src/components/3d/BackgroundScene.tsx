'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial, Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

import { usePathname } from 'next/navigation';

export function DashboardMonolith() {
    const pathname = usePathname();
    const monolithRef = useRef<THREE.Mesh>(null!);
    const ringGroupRef = useRef<THREE.Group>(null!);
    const cameraRef = useRef(new THREE.Vector3());
    const [severity, setSeverity] = React.useState('NORMAL');

    // Dynamic position based on route
    const scenePosition = useMemo(() => {
        if (pathname === '/') return [0, 0, 0] as [number, number, number];
        return [8, 0, -10] as [number, number, number];
    }, [pathname]);

    // Deep, calm cyan/blue for the dashboard interior
    const glowColor = useMemo(() => {
        if (severity === 'CRITICAL') return new THREE.Color('#ef4444');
        if (severity === 'ELEVATED') return new THREE.Color('#f59e0b');
        return new THREE.Color('#0ea5e9');
    }, [severity]);
    
    const ringColor = severity === 'CRITICAL' ? '#f87171' : severity === 'ELEVATED' ? '#fbbf24' : '#38bdf8';

    React.useEffect(() => {
        const handleTriageUpdate = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail && detail.severity) {
                setSeverity(detail.severity);
                // Reset after 10s if critical
                if (detail.severity === 'CRITICAL') {
                    setTimeout(() => setSeverity('NORMAL'), 10000);
                }
            }
        };
        window.addEventListener('dignova-triage-update', handleTriageUpdate);
        return () => window.removeEventListener('dignova-triage-update', handleTriageUpdate);
    }, []);

    useFrame((state, delta) => {
        // 1. Slow, majestic monolith rotation
        if (monolithRef.current) {
            monolithRef.current.rotation.y += delta * 0.05;
            monolithRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
        }

        // 2. Slow Ring rotation
        if (ringGroupRef.current) {
            ringGroupRef.current.rotation.z -= delta * 0.02;
            ringGroupRef.current.rotation.x += delta * 0.01;
        }
    });

    // Geometry memorization
    const ringGeom = useMemo(() => new THREE.TorusGeometry(12, 0.02, 16, 100), []);
    const innerRingGeom = useMemo(() => new THREE.TorusGeometry(9, 0.01, 16, 100), []);

    return (
        <>
            <ambientLight intensity={0.2} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            
            {/* Ambient core glow */}
            <pointLight position={[0, 0, -2]} intensity={8} distance={30} color={glowColor} />

            <Stars radius={100} depth={100} count={10000} factor={7} saturation={0} fade speed={2} />
            <Sparkles count={500} scale={120} size={6} speed={0.4} opacity={1} color="#fff" />

            <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
                <group position={scenePosition}>
                    <mesh ref={monolithRef}>
                        <octahedronGeometry args={[6, 0]} />
                        <MeshTransmissionMaterial 
                            backside
                            thickness={3}
                            roughness={0.15}
                            transmission={1}
                            ior={1.5}
                            chromaticAberration={0.8}
                            anisotropy={0.5}
                            color="#1e1e28"
                        />
                    </mesh>

                    {/* Internal core */}
                    <mesh scale={0.6}>
                        <dodecahedronGeometry args={[3, 0]} />
                        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={2} wireframe />
                    </mesh>
                </group>
            </Float>

            {/* Orbiting rings centered on the monolith */}
            <group ref={ringGroupRef} position={scenePosition}>
                <mesh geometry={ringGeom}>
                    <meshBasicMaterial color={ringColor} transparent opacity={0.15} />
                </mesh>
                <mesh geometry={innerRingGeom} rotation={[Math.PI / 2, 0, 0]}>
                    <meshBasicMaterial color={ringColor} transparent opacity={0.3} />
                </mesh>
            </group>
        </>
    );
}

// Keep the export for backward compatibility, but it will be unused soon
export function BackgroundScene() {
    return <DashboardMonolith />;
}
