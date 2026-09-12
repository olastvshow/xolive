import { useMemo } from 'react';
import { CanvasTexture, RepeatWrapping, Vector2, DoubleSide } from 'three';

// Original lathed cup with a real inner wall, lip, base and molded rings.
export function Cup({ x, z, blue = false }: { x: number; z: number; blue?: boolean }) {
  const profile = useMemo(() => [.0,.02,.08,.4,.55,.58].map((y,i) => new Vector2([.18,.19,.20,.255,.28,.28][i],y)).concat([new Vector2(.255,.58),new Vector2(.175,.045),new Vector2(0,.045)]), []);
  return <group position={[x,.07,z]}>
    <mesh castShadow><latheGeometry args={[profile,32]} /><meshPhysicalMaterial color={blue ? '#2b9bd8' : '#ed3446'} roughness={.3} clearcoat={.6} side={DoubleSide}/></mesh>
    <mesh position={[0,.58,0]} rotation-x={Math.PI/2}><torusGeometry args={[.267,.023,8,32]}/><meshStandardMaterial color="#faf7f4" roughness={.28}/></mesh>
    <mesh position={[0,.055,0]} rotation-x={-Math.PI/2}><circleGeometry args={[.177,24]}/><meshStandardMaterial color="#eee9e5"/></mesh>
    {[.12,.17,.22].map(y=><mesh key={y} position={[0,y,0]} rotation-x={Math.PI/2}><torusGeometry args={[.19+y*.13,.005,4,32]}/><meshStandardMaterial color={blue?'#69bedf':'#ff6470'}/></mesh>)}
  </group>;
}
export function Paddle({ x, z, blue=false }: { x:number; z:number; blue?:boolean }) {
 return <group position={[x,.6,z]} rotation={[.2,0,-.14]}>
  <mesh castShadow scale={[.8,1,1]}><cylinderGeometry args={[.38,.38,.075,40]}/><meshStandardMaterial color="#cfac73" roughness={.6}/></mesh>
  <mesh position={[0,.046,0]} scale={[.8,1,1]}><cylinderGeometry args={[.365,.365,.022,40]}/><meshStandardMaterial color={blue?'#242a30':'#ec4050'} roughness={.85}/></mesh>
  <mesh position={[0,0,.43]} castShadow><boxGeometry args={[.13,.09,.4]}/><meshStandardMaterial color="#bd8c55" roughness={.65}/></mesh>
 </group>;
}
export function Table({ tennis }: { tennis: boolean }) {
 const texture=useMemo(()=>{const c=document.createElement('canvas'); c.width=c.height=128;const g=c.getContext('2d'); if(g){g.fillStyle=tennis?'#1561a0':'#187764';g.fillRect(0,0,128,128);for(let i=0;i<1200;i++){g.fillStyle=i%2?'#ffffff08':'#00000008';g.fillRect((i*37)%128,(i*71)%128,1,1);}}const t=new CanvasTexture(c);t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(4,8);return t;},[tennis]);
 return <>
  <mesh position={[0,-.09,0]} receiveShadow castShadow><boxGeometry args={[3.65,.18,8.3]}/><meshStandardMaterial map={texture} roughness={.7}/></mesh>
  {[-1,1].map(side=><group key={side}><mesh position={[side*1.79,.012,0]}><boxGeometry args={[.035,.012,8.1]}/><meshStandardMaterial color="#ebf3f0"/></mesh><mesh position={[0,.012,side*4.03]}><boxGeometry args={[3.58,.012,.035]}/><meshStandardMaterial color="#ebf3f0"/></mesh>
   {[-2.7,2.7].map(z=><mesh key={z} position={[side*1.3,-.9,z]} castShadow><boxGeometry args={[.12,1.65,.12]}/><meshStandardMaterial color="#39444d" metalness={.7} roughness={.35}/></mesh>)}
  </group>)}
  {tennis&&<><mesh position={[0,.015,0]}><boxGeometry args={[.025,.01,8.1]}/><meshStandardMaterial color="#ebf3f0"/></mesh>
    <mesh position={[0,.36,0]}><planeGeometry args={[3.8,.7,30,7]}/><meshStandardMaterial color="#e1e9ee" wireframe transparent opacity={.55} side={DoubleSide}/></mesh>
    <mesh position={[0,.72,0]}><boxGeometry args={[3.9,.04,.04]}/><meshStandardMaterial color="#f1f5f4"/></mesh>
    {[-1.9,1.9].map(x=><mesh key={x} position={[x,.35,0]}><cylinderGeometry args={[.035,.035,.8,8]}/><meshStandardMaterial color="#a8adb5" metalness={.8} roughness={.25}/></mesh>)}
  </>}
  <mesh rotation-x={-Math.PI/2} position={[0,-1.78,0]} receiveShadow><planeGeometry args={[100,100]}/><meshStandardMaterial color="#28323b" roughness={.95}/></mesh>
  {Array.from({length:15},(_,i)=><mesh key={i} position={[i*1.2-8,-1.773,0]} rotation-x={-Math.PI/2}><planeGeometry args={[.012,35]}/><meshStandardMaterial color="#47525b"/></mesh>)}
 </>;
}
