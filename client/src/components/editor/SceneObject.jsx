import { useRef, useState, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { TransformControls, Billboard } from "@react-three/drei";
import { useSnapshot } from "valtio";
import { editorStore, updateObject, selectObject } from "../../stores/editorStore";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

function GLBModel({ url, onClick, animated, isPlaying, fallbackColor }) {
  const [gltf, setGltf] = useState(null);
  const [error, setError] = useState(false);
  const groupRef = useRef();
  const mixerRef = useRef(null);
  const actionsRef = useRef([]);

  // Load GLB manually for proper error handling
  useEffect(() => {
    if (!url) return;
    setGltf(null);
    setError(false);

    const loader = new GLTFLoader();
    loader.load(
      url,
      (result) => {
        // Enable shadows on all meshes
        result.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        setGltf(result);
      },
      undefined,
      (err) => {
        console.error("GLB load failed:", err);
        setError(true);
      },
    );
  }, [url]);

  // Auto-ground the model: compute bounding box and shift so feet touch y=0
  useEffect(() => {
    if (!gltf) return;
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const yOffset = -box.min.y;
    gltf.scene.position.y = yOffset;
  }, [gltf]);

  // Set up animation mixer when GLTF loads
  useEffect(() => {
    if (!gltf || !animated || gltf.animations.length === 0) return;

    const mixer = new THREE.AnimationMixer(gltf.scene);
    mixerRef.current = mixer;

    actionsRef.current = gltf.animations.map((clip) => mixer.clipAction(clip));

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
      actionsRef.current = [];
    };
  }, [gltf, animated]);

  // Play/stop animations based on isPlaying
  useEffect(() => {
    if (!mixerRef.current || actionsRef.current.length === 0) return;

    if (isPlaying) {
      actionsRef.current.forEach((action) => {
        action.reset().play();
      });
    } else {
      actionsRef.current.forEach((action) => {
        action.stop();
      });
    }
  }, [isPlaying]);

  // Update animation mixer every frame
  useFrame((_, delta) => {
    if (mixerRef.current && isPlaying) {
      mixerRef.current.update(delta);
    }
  });

  if (error) {
    return <FallbackCharacter color={fallbackColor} onClick={onClick} />;
  }

  if (!gltf) {
    // Loading indicator - a pulsing sphere
    return (
      <mesh onClick={onClick}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#6366f1" wireframe />
      </mesh>
    );
  }

  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene} onClick={onClick} />
    </group>
  );
}

function ImageCharacter({ imageUrl, onClick }) {
  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load(imageUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [imageUrl]);

  return (
    <Billboard>
      <mesh onClick={onClick} castShadow>
        <planeGeometry args={[1.5, 2]} />
        <meshStandardMaterial map={texture} side={THREE.DoubleSide} />
      </mesh>
    </Billboard>
  );
}

function FallbackCharacter({ color, onClick }) {
  return (
    <group onClick={onClick}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.08, 1.18, 0.18]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0.08, 1.18, 0.18]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[-0.38, 0.6, 0]} castShadow>
        <boxGeometry args={[0.15, 0.5, 0.15]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.38, 0.6, 0]} castShadow>
        <boxGeometry args={[0.15, 0.5, 0.15]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.13, 0.15, 0]} castShadow>
        <boxGeometry args={[0.16, 0.35, 0.16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.13, 0.15, 0]} castShadow>
        <boxGeometry args={[0.16, 0.35, 0.16]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function CharacterContent({ obj, onClick, isPlaying }) {
  if (obj.modelUrl) {
    return <GLBModel url={obj.modelUrl} onClick={onClick} animated={!!obj.animated} isPlaying={isPlaying} fallbackColor={obj.color} />;
  }
  if (obj.imageUrl) {
    return <ImageCharacter imageUrl={obj.imageUrl} onClick={onClick} />;
  }
  return <FallbackCharacter color={obj.color} onClick={onClick} />;
}

function ObjectGeometry({ type }) {
  switch (type) {
    case "sphere":
      return <sphereGeometry args={[0.5, 32, 32]} />;
    case "cylinder":
      return <cylinderGeometry args={[0.4, 0.4, 1, 32]} />;
    case "cone":
      return <coneGeometry args={[0.5, 1, 32]} />;
    case "torus":
      return <torusGeometry args={[0.4, 0.15, 16, 32]} />;
    case "plane":
      return <planeGeometry args={[2, 2]} />;
    case "box":
    default:
      return <boxGeometry args={[1, 1, 1]} />;
  }
}

function AnimatedWrapper({ children, obj, isPlaying }) {
  const groupRef = useRef();
  const startPos = useRef(null);

  // Characters with skeletal animations (obj.animated) handle their own animation
  // via the GLB mixer - skip programmatic movement for them
  const hasSkeletalAnim = obj.type === "character" && obj.animated;

  useEffect(() => {
    if (!groupRef.current) return;

    if (isPlaying) {
      // Save starting transform
      startPos.current = new THREE.Vector3(0, 0, 0);
    } else {
      // Reset to origin when stopping (the parent mesh has obj.position)
      groupRef.current.position.set(0, 0, 0);
      groupRef.current.rotation.set(0, 0, 0);
      groupRef.current.scale.set(1, 1, 1);
    }
  }, [isPlaying]);

  useFrame((state) => {
    if (!isPlaying || !groupRef.current || hasSkeletalAnim || obj.animation === "none") return;
    const t = state.clock.elapsedTime;

    switch (obj.animation) {
      case "bounce":
        groupRef.current.position.y = Math.abs(Math.sin(t * 3)) * 0.8;
        break;
      case "spin":
        groupRef.current.rotation.y += 0.03;
        break;
      case "float":
        groupRef.current.position.y = Math.sin(t * 1.5) * 0.3;
        groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.1;
        break;
      case "walk":
        groupRef.current.position.x = Math.sin(t * 0.8) * 3;
        groupRef.current.position.z = Math.cos(t * 0.8) * 3;
        groupRef.current.rotation.y = -t * 0.8 + Math.PI / 2;
        break;
      case "jump": {
        const cycle = (t * 2) % 2;
        groupRef.current.position.y = cycle < 1 ? Math.sin(cycle * Math.PI) * 1.5 : 0;
        break;
      }
      case "pulse": {
        const s = 1 + Math.sin(t * 3) * 0.15;
        groupRef.current.scale.set(s, s, s);
        break;
      }
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

export function SceneObject({ obj }) {
  const snap = useSnapshot(editorStore);
  const meshRef = useRef();
  const isSelected = snap.selectedId === obj.id;

  const texture = useMemo(() => {
    if (obj.type !== "character" && obj.textureUrl) {
      const tex = new THREE.TextureLoader().load(obj.textureUrl);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }
    return null;
  }, [obj.textureUrl, obj.type]);

  const handleClick = (e) => {
    if (snap.isPlaying) return;
    e.stopPropagation();
    selectObject(obj.id);
  };

  const syncTransform = () => {
    if (!meshRef.current) return;
    const p = meshRef.current.position;
    const r = meshRef.current.rotation;
    const s = meshRef.current.scale;
    updateObject(obj.id, {
      position: [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)],
      rotation: [+r.x.toFixed(3), +r.y.toFixed(3), +r.z.toFixed(3)],
      scale: [+s.x.toFixed(3), +s.y.toFixed(3), +s.z.toFixed(3)],
    });
  };

  const content =
    obj.type === "character" ? (
      <group ref={meshRef} position={obj.position} rotation={obj.rotation} scale={obj.scale}>
        <CharacterContent obj={obj} onClick={handleClick} isPlaying={snap.isPlaying} />
      </group>
    ) : (
      <mesh ref={meshRef} position={obj.position} rotation={obj.rotation} scale={obj.scale} castShadow receiveShadow onClick={handleClick}>
        <ObjectGeometry type={obj.type} />
        <meshStandardMaterial
          color={texture ? "#ffffff" : obj.color}
          map={texture}
          metalness={obj.metalness}
          roughness={obj.roughness}
          side={obj.type === "plane" ? THREE.DoubleSide : THREE.FrontSide}
        />
      </mesh>
    );

  return (
    <AnimatedWrapper obj={obj} isPlaying={snap.isPlaying}>
      {content}
      {isSelected && !snap.isPlaying && meshRef.current && (
        <TransformControls object={meshRef} mode={snap.transformMode} onMouseUp={syncTransform} size={0.6} />
      )}
    </AnimatedWrapper>
  );
}
