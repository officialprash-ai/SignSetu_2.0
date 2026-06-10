import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface SignAvatarProps {
  isPlaying?: boolean;
  playbackSpeed?: number;
  onAnimationComplete?: () => void;
}

/**
 * Simple avatar skeleton for sign language animation
 * In production, this would load a Ready Player Me avatar GLB
 */
function AvatarMesh() {
  const groupRef = useRef<THREE.Group>(null);
  const [mixer, setMixer] = useState<THREE.AnimationMixer | null>(null);

  useEffect(() => {
    if (!groupRef.current) return;

    // Create a simple skeleton for demonstration
    const skeleton = new THREE.Group();

    // Head
    const headGeometry = new THREE.SphereGeometry(0.2, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xfdbcb4 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    skeleton.add(head);

    // Body
    const bodyGeometry = new THREE.CapsuleGeometry(0.15, 0.8, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4a90e2 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.8;
    skeleton.add(body);

    // Left arm
    const armGeometry = new THREE.CapsuleGeometry(0.08, 0.7, 4, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0xfdbcb4 });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.4, 1.2, 0);
    leftArm.rotation.z = Math.PI / 6;
    skeleton.add(leftArm);

    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.4, 1.2, 0);
    rightArm.rotation.z = -Math.PI / 6;
    skeleton.add(rightArm);

    // Left leg
    const legGeometry = new THREE.CapsuleGeometry(0.08, 0.8, 4, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0.1, 0);
    skeleton.add(leftLeg);

    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.1, 0);
    skeleton.add(rightLeg);

    groupRef.current.add(skeleton);

    // Create animation mixer
    const newMixer = new THREE.AnimationMixer(skeleton);
    setMixer(newMixer);
  }, []);

  useFrame((state, delta) => {
    if (mixer) {
      mixer.update(delta);
    }
  });

  return <group ref={groupRef} />;
}

/**
 * 3D Avatar component for displaying sign language animations
 */
export function SignAvatar({ isPlaying = true, playbackSpeed = 1, onAnimationComplete }: SignAvatarProps) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [0, 1, 2.5], fov: 50 }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Environment preset="studio" />
        <AvatarMesh />
        <OrbitControls
          autoRotate
          autoRotateSpeed={2}
          enableZoom={false}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}
