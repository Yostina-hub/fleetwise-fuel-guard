import { useEffect, useRef, memo } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
}

export const ExecutiveTechBackground = memo(function ExecutiveTechBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = canvas.parentElement;
    if (!container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create particles
    const createParticles = () => {
      const particles: Particle[] = [];
      const particleCount = Math.floor((canvas.width * canvas.height) / 25000);

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speedY: Math.random() * 0.3 + 0.05,
          speedX: (Math.random() - 0.5) * 0.2,
          opacity: Math.random() * 0.6 + 0.2,
        });
      }

      return particles;
    };

    particlesRef.current = createParticles();

    const drawBackground = () => {
      // Create deep blue gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#001a33');
      gradient.addColorStop(0.3, '#002244');
      gradient.addColorStop(0.7, '#001a33');
      gradient.addColorStop(1, '#000d1a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw perspective grid floor
      const horizonY = canvas.height * 0.65;
      const vanishingX = canvas.width / 2;
      
      ctx.strokeStyle = 'rgba(0, 180, 255, 0.08)';
      ctx.lineWidth = 1;

      // Horizontal lines on floor
      for (let i = 0; i < 20; i++) {
        const y = horizonY + (canvas.height - horizonY) * (i / 20) * (i / 20);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Vertical perspective lines
      for (let i = -10; i <= 10; i++) {
        const endX = vanishingX + i * 400;
        ctx.beginPath();
        ctx.moveTo(vanishingX, horizonY);
        ctx.lineTo(endX, canvas.height);
        ctx.stroke();
      }

      // Draw tech arc segments at top
      const arcCenterX = canvas.width / 2;
      const arcCenterY = canvas.height * 0.5;
      
      for (let ring = 0; ring < 4; ring++) {
        const radius = 200 + ring * 80;
        const segments = 12;
        
        for (let i = 0; i < segments; i++) {
          const startAngle = (i / segments) * Math.PI - Math.PI;
          const endAngle = startAngle + (Math.PI / segments) * 0.7;
          const opacity = 0.1 + Math.random() * 0.15;
          
          ctx.strokeStyle = `rgba(0, 180, 255, ${opacity})`;
          ctx.lineWidth = 3 + ring * 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(arcCenterX, arcCenterY, radius, startAngle, endAngle);
          ctx.stroke();
        }
      }

      // Draw floating rectangles (tech blocks) on sides
      const drawTechBlock = (x: number, y: number, w: number, h: number, opacity: number) => {
        ctx.fillStyle = `rgba(0, 100, 180, ${opacity})`;
        ctx.strokeStyle = `rgba(0, 200, 255, ${opacity * 1.5})`;
        ctx.lineWidth = 1;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      };

      // Left side blocks
      for (let i = 0; i < 6; i++) {
        const x = 20 + Math.random() * 100;
        const y = 100 + i * 100 + Math.random() * 30;
        const w = 30 + Math.random() * 50;
        const h = 20 + Math.random() * 30;
        drawTechBlock(x, y, w, h, 0.1 + Math.random() * 0.1);
      }

      // Right side blocks
      for (let i = 0; i < 6; i++) {
        const x = canvas.width - 150 + Math.random() * 100;
        const y = 100 + i * 100 + Math.random() * 30;
        const w = 30 + Math.random() * 50;
        const h = 20 + Math.random() * 30;
        drawTechBlock(x, y, w, h, 0.1 + Math.random() * 0.1);
      }

      // Center glow
      const centerGlow = ctx.createRadialGradient(
        canvas.width / 2, canvas.height * 0.55, 0,
        canvas.width / 2, canvas.height * 0.55, 300
      );
      centerGlow.addColorStop(0, 'rgba(0, 200, 255, 0.15)');
      centerGlow.addColorStop(0.5, 'rgba(0, 100, 200, 0.05)');
      centerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBackground();

      // Draw and animate particles
      particlesRef.current.forEach((particle) => {
        particle.y -= particle.speedY;
        particle.x += particle.speedX;

        if (particle.y < -10) {
          particle.y = canvas.height + 10;
          particle.x = Math.random() * canvas.width;
        }
        if (particle.x < -10) particle.x = canvas.width + 10;
        if (particle.x > canvas.width + 10) particle.x = -10;

        // Draw particle glow
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 3
        );
        gradient.addColorStop(0, `rgba(0, 220, 255, ${particle.opacity})`);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw core
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 220, 255, ${particle.opacity * 1.5})`;
        ctx.fill();
      });

      // Draw connecting lines
      particlesRef.current.forEach((p1, i) => {
        particlesRef.current.slice(i + 1, i + 6).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 200, 255, ${0.15 * (1 - distance / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />
      {/* Top-right green corner edge */}
      <div className="absolute top-0 right-0 pointer-events-none">
        <svg 
          width="120" 
          height="140" 
          viewBox="0 0 120 140" 
          className="block"
        >
          <path 
            d="M120 0 L120 120 Q120 90, 90 65 Q50 25, 0 0 L120 0 Z"
            fill="#8DC63F"
          />
        </svg>
      </div>
      
      {/* Bottom-left green corner edge */}
      <div className="absolute bottom-0 left-0 pointer-events-none">
        <svg 
          width="120" 
          height="50" 
          viewBox="0 0 120 50" 
          className="block"
        >
          <path 
            d="M0 50 L0 0 Q25 0, 65 18 Q105 36, 120 50 L0 50 Z"
            fill="#8DC63F"
          />
        </svg>
      </div>
    </>
  );
});
