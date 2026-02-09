import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

type Service3DProps = {
  serviceSlug?: string;
};


// Schematic diagram for consulting: blocks, arrows, lines
function ConsultingSchematic() {
  return (
    <>
      {/* Bloc principal: Analiză */}
      <mesh position={[-2, 0, 0]}>
        <boxGeometry args={[1.2, 0.7, 0.3]} />
        <meshStandardMaterial color="#2563eb" />
      </mesh>
      {/* Bloc: Proiectare */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[1.2, 0.7, 0.3]} />
        <meshStandardMaterial color="#60a5fa" />
      </mesh>
      {/* Bloc: Instruire */}
      <mesh position={[2, 0, 0]}>
        <boxGeometry args={[1.2, 0.7, 0.3]} />
        <meshStandardMaterial color="#38bdf8" />
      </mesh>
      {/* Linii de conexiune (cilindri subțiri) */}
      <mesh position={[-1, 0.5, 0]} rotation={[0, 0, Math.PI/4]}>
        <cylinderGeometry args={[0.04, 0.04, 1.4, 16]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      <mesh position={[1, 0.5, 0]} rotation={[0, 0, -Math.PI/4]}>
        <cylinderGeometry args={[0.04, 0.04, 1.4, 16]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      {/* Săgeți (conuri) */}
      <mesh position={[-0.3, 0.8, 0]} rotation={[0, 0, Math.PI/4]}>
        <coneGeometry args={[0.09, 0.25, 16]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      <mesh position={[0.3, 0.8, 0]} rotation={[0, 0, -Math.PI/4]}>
        <coneGeometry args={[0.09, 0.25, 16]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      {/* Simboluri: sferă (know-how), disc (documentație) */}
      <mesh position={[-2, -0.6, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#f59e42" />
      </mesh>
      <mesh position={[2, -0.6, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.05, 32]} />
        <meshStandardMaterial color="#f59e42" />
      </mesh>
    </>
  );
}

function RobotCell() {
  return (
    <>
      {/* Platformă */}
      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[4, 0.3, 4]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      {/* Braț robot */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 1.2, 32]} />
        <meshStandardMaterial color="#2563eb" />
      </mesh>
      <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.2, 1, 0.2]} />
        <meshStandardMaterial color="#60a5fa" />
      </mesh>
      {/* Piesă preluată */}
      <mesh position={[0.7, 1, 0]}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial color="#f59e42" />
      </mesh>
    </>
  );
}

function ElectricPanel() {
  return (
    <>
      {/* Cutie panou */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 3, 0.5]} />
        <meshStandardMaterial color="#2563eb" />
      </mesh>
      {/* Ușă */}
      <mesh position={[0, 0, 0.28]}>
        <boxGeometry args={[1.8, 2.8, 0.05]} />
        <meshStandardMaterial color="#60a5fa" />
      </mesh>
      {/* Mânere */}
      <mesh position={[0.7, -1, 0.32]}>
        <cylinderGeometry args={[0.05, 0.05, 0.2, 32]} />
        <meshStandardMaterial color="#f59e42" />
      </mesh>
    </>
  );
}

function getSchematic(slug?: string) {
  switch (slug) {
    case 'consultanta-tehnica':
      return <ConsultingSchematic />;
    case 'proiectare-statii-linii':
      return <ConsultingSchematic />;
    case 'integrare-roboti':
      return <RobotCell />;
    case 'tablouri-electrice':
      return <ElectricPanel />;
    default:
      return <ConsultingSchematic />;
  }
}

export default function Service3D({ serviceSlug }: Service3DProps) {
  return (
    <Canvas camera={{ position: [0, 1, 7] }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} />
      {getSchematic(serviceSlug)}
      <OrbitControls />
    </Canvas>
  );
}
