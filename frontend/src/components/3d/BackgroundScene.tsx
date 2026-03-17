'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial, Environment, Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

function DashboardMonolith() {
    const monolithRef = useRef<THREE.Mesh>(null!);
    const ringGroupRef = useRef<THREE.Group>(null!);
    const cameraRef = useRef(new THREE.Vector3());
    const [severity, setSeverity] = React.useState('NORMAL');

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

        // 3. Subtle Parallax Camera Tracking
        const mouseX = (state.pointer.x * state.viewport.width) / 10;
        const mouseY = (state.pointer.y * state.viewport.height) / 10;
        
        // Push the monolith further back and to the right in the dashboard so it doesn't block UI
        cameraRef.current.set(-mouseX * 0.5 - 5, mouseY * 0.5, 20);
        state.camera.position.lerp(cameraRef.current, delta * 2);
        state.camera.lookAt(0, 0, 0);
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

            <Environment preset="city" />
            <Stars radius={100} depth={100} count={10000} factor={7} saturation={0} fade speed={2} />
            <Sparkles count={500} scale={120} size={6} speed={0.4} opacity={1} color="#fff" />

            <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
                <group position={[8, 0, -10]}> {/* Offset to the right */}
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
            <group ref={ringGroupRef} position={[8, 0, -10]}>
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

export function BackgroundScene() {
    return (
        <div className="absolute inset-0 z-[-1] overflow-hidden pointer-events-none w-full h-full bg-[#020205]">
            <Canvas camera={{ position: [0, 0, 20], fov: 45 }}>
                <DashboardMonolith />
            </Canvas>
        </div>
    );
}

