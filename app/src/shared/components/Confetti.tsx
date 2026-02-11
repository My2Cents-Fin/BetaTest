import { useEffect, useState } from 'react';

interface ConfettiProps {
  onComplete?: () => void;
}

export function Confetti({ onComplete }: ConfettiProps) {
  const [confettiPieces] = useState(() => {
    // Generate 60 random confetti pieces with varied properties
    return Array.from({ length: 60 }, (_, i) => {
      const angle = (Math.random() - 0.5) * 120; // -60 to +60 degrees spread
      const velocity = 50 + Math.random() * 100; // Random initial velocity
      const rotation = Math.random() * 360; // Random initial rotation
      const rotationSpeed = (Math.random() - 0.5) * 720; // Random rotation speed

      return {
        id: i,
        angle,
        velocity,
        rotation,
        rotationSpeed,
        delay: Math.random() * 0.3,
        duration: 2.5 + Math.random() * 1,
        color: ['#9333ea', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'][Math.floor(Math.random() * 7)],
        shape: Math.random() > 0.5 ? 'rect' : 'circle', // Mix of rectangles and circles
      };
    });
  });

  useEffect(() => {
    // Auto-complete after 3.5 seconds
    const timer = setTimeout(() => {
      onComplete?.();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confettiPieces.map(piece => (
        <div
          key={piece.id}
          className={`absolute animate-confetti-fall ${piece.shape === 'circle' ? 'rounded-full' : 'rounded-sm'}`}
          style={{
            left: '50%',
            top: '20%',
            width: piece.shape === 'circle' ? '8px' : '10px',
            height: piece.shape === 'circle' ? '8px' : '6px',
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            '--confetti-angle': `${piece.angle}deg`,
            '--confetti-velocity': `${piece.velocity}px`,
            '--confetti-rotation': `${piece.rotation}deg`,
            '--confetti-rotation-speed': `${piece.rotationSpeed}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
