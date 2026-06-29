// Cleaned ThreeLogo
// import { Canvas, useFrame } from '@react-three/fiber';
// import { Float, MeshDistortMaterial, Sphere } from '@react-three/drei';

// Debugging: Replaced 3D Canvas with static placeholder
export default function ThreeLogo() {
    return (
        <div style={{
            width: '60px',
            height: '60px',
            background: 'var(--accent-primary)',
            borderRadius: '50%',
            boxShadow: '0 0 20px var(--accent-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
        }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.5))' }}>
                <path d="M12 2L17.5 12H6.5L12 2Z" fill="#FFFFFF" />
                <path d="M5.5 13.5L2 21.5H11.5L9.5 17.5H6.5L5.5 13.5Z" fill="#FFFFFF" />
                <path d="M18.5 13.5L22 21.5H12.5L14.5 17.5H17.5L18.5 13.5Z" fill="#FFFFFF" />
            </svg>
        </div>
    );
}
