'use client';

import React, { useRef, useLayoutEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function CoreParticles() {
    const groupRef = useRef<THREE.Group>(null!);
    const pointsRef = useRef<THREE.Points>(null!);
    
    // Create a complex matrix of particles
    const particlesCount = 2000;
    const positions = useMemo(() => {
        const pos = new Float32Array(particlesCount * 3);
        for(let i = 0; i < particlesCount; i++) {
            // Distribute points in a spherical shell
            const radius = 2 + Math.random() * 0.5;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            pos[i*3] = radius * Math.sin(phi) * Math.cos(theta); // x
            pos[i*3+1] = radius * Math.sin(phi) * Math.sin(theta); // y
            pos[i*3+2] = radius * Math.cos(phi); // z
        }
        return pos;
    }, []);

    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            // Initial dormant state
            gsap.set(groupRef.current.scale, { x: 0.8, y: 0.8, z: 0.8 });
            
            // Scroll animation timeline
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: "#main-scroll-container",
                    start: "top top",
                    end: "bottom bottom",
                    scrub: 1, // Smooth scrubbing
                }
            });

            // Sequence 1: The Awakening (Hero -> Matrix)
            tl.to(groupRef.current.rotation, {
                y: Math.PI * 2,
                x: Math.PI / 2,
                ease: "none"
            }, 0)
            .to(groupRef.current.scale, {
                x: 1.5,
                y: 1.5,
                z: 1.5,
                ease: "power1.inOut"
            }, 0)
            
            // Sequence 2: Diving into the Core
            .to(groupRef.current.position, {
                z: 5, // Move towards camera
                ease: "power2.inOut"
            }, 0.5)
            // Disperse particles slightly as we get close
            .to(pointsRef.current.material, {
                size: 0.05,
                opacity: 0.6,
                transparent: true,
                ease: "power1.out"
            }, 0.5);

        });

        return () => ctx.revert();
    }, []);

    return (
        <group ref={groupRef}>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                {/* Central glowing core */}
                <mesh>
                    <icosahedronGeometry args={[1, 2]} />
                    <meshStandardMaterial 
                        color="#0ea5e9" // accent-cyan
                        wireframe 
                        emissive="#0ea5e9"
                        emissiveIntensity={2}
                        transparent
                        opacity={0.3}
                    />
                </mesh>
                
                {/* Outer particle shell */}
                <points ref={pointsRef}>
                    <bufferGeometry>
                        <bufferAttribute 
                            attach="attributes-position"
                            count={particlesCount}
                            array={positions}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <pointsMaterial 
                        size={0.02} 
                        color="#d946ef" // accent-purple
                        sizeAttenuation={true} 
                        transparent
                        opacity={0.8}
                        blending={THREE.AdditiveBlending}
                    />
                </points>
            </Float>
        </group>
    );
}

export function SentientCore() {
    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none w-full h-full bg-[#050510]">
            <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={2} color="#06b6d4" />
                <directionalLight position={[-10, -10, -5]} intensity={2} color="#d946ef" />
                
                <CoreParticles />
                
                <Environment preset="city" />
                {/* Optional: Add gentle auto-rotation separate from scroll */}
               <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
            </Canvas>
        </div>
    );
}

