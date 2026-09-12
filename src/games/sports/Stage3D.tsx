import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Suspense, useEffect, useState, type ReactNode } from 'react';

/** Shared lit canvas for the 3D sports games. Client-only: never rendered during SSR. */
export function Stage3D({ children, camera, background }: { children: ReactNode; camera: [number, number, number]; background: string }) {
  const [mounted, setMounted] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => setMounted(true), []);
  if (failed) return <div className="grid aspect-[4/5] w-full place-items-center rounded-[28px] bg-night-2 px-6 text-center text-sm text-ink/50">This device cannot show the 3D table. The scores and controls below still work.</div>;
  if (!mounted) return <div className="aspect-[4/5] w-full animate-pulse rounded-[28px] bg-night-2" aria-hidden />;
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[28px] sm:aspect-[16/10]">
      <Canvas shadows dpr={[1, 2]} camera={{ position: camera, fov: 46 }} onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', () => setFailed(true)); }}>
        <color attach="background" args={[background]} />
        <fog attach="fog" args={[background, 12, 30]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 9, 6]} intensity={2.1} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} />
        <directionalLight position={[-6, 5, -4]} intensity={0.5} color="#8fb8ff" />
        <Suspense fallback={null}>
          <Environment>
            <Lightformer intensity={2.4} position={[0, 6, 2]} scale={[10, 6, 1]} />
            <Lightformer intensity={1} color="#7fd3ff" position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[16, 3, 1]} />
          </Environment>
          {children}
        </Suspense>
      </Canvas>
    </div>
  );
}
