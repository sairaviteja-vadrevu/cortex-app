import { Grid } from "@react-three/drei";

export function Ground() {
  return (
    <>
      <Grid
        position={[0, 0, 0]}
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2a2a3a"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#4a4a6a"
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <shadowMaterial transparent opacity={0.3} />
      </mesh>
    </>
  );
}
