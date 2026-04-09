import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Sky, useTexture } from "@react-three/drei";
import { useSnapshot } from "valtio";
import { editorStore, clearSelection, removeObject } from "../../stores/editorStore";
import { Ground } from "./Ground";
import { SceneObject } from "./SceneObject";
import * as THREE from "three";

function BackgroundImage({ url }) {
  const texture = useTexture(url);
  return (
    <mesh scale={[-100, 100, 100]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

function SceneBackground() {
  const snap = useSnapshot(editorStore);
  const bg = snap.background;

  if (bg.type === "color") {
    return (
      <>
        <color attach="background" args={[bg.value]} />
        <Environment preset="sunset" background={false} />
      </>
    );
  }

  if (bg.type === "image" && bg.url) {
    return (
      <>
        <Suspense fallback={null}>
          <BackgroundImage url={bg.url} />
        </Suspense>
        <Environment preset="sunset" background={false} />
      </>
    );
  }

  const preset = bg.preset || "sunset";
  const hasSky = ["sunset", "dawn", "night"].includes(preset);

  if (hasSky) {
    return (
      <>
        <Environment preset={preset} background={false} />
        <Sky
          sunPosition={getSunPosition(preset)}
          turbidity={preset === "night" ? 20 : 8}
          rayleigh={preset === "night" ? 0.1 : 2}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />
      </>
    );
  }

  return <Environment preset={preset} background />;
}

function getSunPosition(preset) {
  switch (preset) {
    case "dawn":
      return [1, 0.3, 0];
    case "night":
      return [0, -1, 0];
    case "sunset":
      return [1, 0.1, -0.5];
    default:
      return [1, 2, 1];
  }
}

function KeyboardHandler() {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

      switch (e.key.toLowerCase()) {
        case "w":
          editorStore.transformMode = "translate";
          break;
        case "e":
          editorStore.transformMode = "rotate";
          break;
        case "r":
          editorStore.transformMode = "scale";
          break;
        case "delete":
        case "backspace":
          if (editorStore.selectedId) {
            removeObject(editorStore.selectedId);
          }
          break;
        case "escape":
          editorStore.selectedId = null;
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);
  return null;
}

export function Scene() {
  const snap = useSnapshot(editorStore);

  return (
    <Canvas
      shadows
      camera={{ position: [8, 6, 8], fov: 50 }}
      onPointerMissed={() => clearSelection()}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <KeyboardHandler />

      <Suspense fallback={null}>
        <SceneBackground />
      </Suspense>

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <pointLight position={[-10, 5, -10]} intensity={0.5} color="#6366f1" />

      <Ground />

      {snap.objects.map((obj) => (
        <SceneObject key={obj.id} obj={obj} />
      ))}

      <OrbitControls makeDefault enableDamping dampingFactor={0.1} minDistance={2} maxDistance={50} maxPolarAngle={Math.PI / 2 - 0.05} />
    </Canvas>
  );
}
