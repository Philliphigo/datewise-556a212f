import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  type: "left" | "right" | "heart" | "bg";
  phase: number;
}

const DotParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);
  const timeRef = useRef(0);
  const rippleRef = useRef<{ x: number; y: number; t: number; r: number }[]>([]);

  const getPersonPoints = useCallback(
    (cx: number, cy: number, scale: number, isMale: boolean): [number, number][] => {
      const pts: [number, number][] = [];
      const s = scale;

      // Head (circle)
      for (let a = 0; a < Math.PI * 2; a += 0.15) {
        for (let r = 0; r < s * 18; r += s * 3) {
          pts.push([cx + Math.cos(a) * r, cy - s * 60 + Math.sin(a) * r]);
        }
      }

      // Neck
      for (let y = 0; y < s * 12; y += s * 3) {
        for (let x = -s * 5; x <= s * 5; x += s * 3) {
          pts.push([cx + x, cy - s * 42 + y]);
        }
      }

      // Torso
      const torsoWidth = isMale ? s * 28 : s * 22;
      const waistWidth = isMale ? s * 22 : s * 16;
      for (let y = 0; y < s * 45; y += s * 3) {
        const t = y / (s * 45);
        const w = torsoWidth + (waistWidth - torsoWidth) * t;
        for (let x = -w; x <= w; x += s * 3) {
          pts.push([cx + x, cy - s * 30 + y]);
        }
      }

      // Shoulders/Arms
      const shoulderW = isMale ? s * 35 : s * 28;
      for (let y = 0; y < s * 35; y += s * 3) {
        const armW = shoulderW - y * 0.4;
        if (armW > s * 4) {
          pts.push([cx - armW, cy - s * 28 + y]);
          pts.push([cx - armW + s * 3, cy - s * 28 + y]);
          pts.push([cx + armW, cy - s * 28 + y]);
          pts.push([cx + armW - s * 3, cy - s * 28 + y]);
        }
      }

      // Hips and legs
      const hipWidth = isMale ? s * 20 : s * 26;
      for (let y = 0; y < s * 50; y += s * 3) {
        const t = y / (s * 50);
        const legGap = s * 3 + t * s * 6;
        const legW = hipWidth - t * s * 10;
        // Left leg
        for (let x = -legGap - legW; x <= -legGap; x += s * 3) {
          pts.push([cx + x, cy + s * 15 + y]);
        }
        // Right leg
        for (let x = legGap; x <= legGap + legW; x += s * 3) {
          pts.push([cx + x, cy + s * 15 + y]);
        }
      }

      return pts;
    },
    []
  );

  const getHeartPoints = useCallback(
    (cx: number, cy: number, size: number): [number, number][] => {
      const pts: [number, number][] = [];
      for (let a = 0; a < Math.PI * 2; a += 0.2) {
        const r = size;
        const x = r * 16 * Math.pow(Math.sin(a), 3);
        const y = -r * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
        pts.push([cx + x * 0.06, cy + y * 0.06]);
      }
      // Fill
      for (let a = 0; a < Math.PI * 2; a += 0.35) {
        for (let sc = 0.3; sc < 1; sc += 0.25) {
          const r = size * sc;
          const x = r * 16 * Math.pow(Math.sin(a), 3);
          const y = -r * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
          pts.push([cx + x * 0.06, cy + y * 0.06]);
        }
      }
      return pts;
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let animId = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles();
    };

    const initParticles = () => {
      const particles: Particle[] = [];
      const isMobile = w < 768;
      const scale = isMobile ? 0.55 : 0.8;
      const centerY = h * 0.48;

      // Silhouette positions - start far apart
      const leftX = isMobile ? w * 0.3 : w * 0.58;
      const rightX = isMobile ? w * 0.7 : w * 0.82;

      // Left figure
      const leftPts = getPersonPoints(leftX, centerY, scale, true);
      leftPts.forEach(([px, py]) => {
        particles.push({
          x: px + (Math.random() - 0.5) * 200,
          y: py + (Math.random() - 0.5) * 200,
          baseX: px,
          baseY: py,
          vx: 0,
          vy: 0,
          size: 1.2 + Math.random() * 1,
          alpha: 0.4 + Math.random() * 0.5,
          type: "left",
          phase: Math.random() * Math.PI * 2,
        });
      });

      // Right figure
      const rightPts = getPersonPoints(rightX, centerY, scale, false);
      rightPts.forEach(([px, py]) => {
        particles.push({
          x: px + (Math.random() - 0.5) * 200,
          y: py + (Math.random() - 0.5) * 200,
          baseX: px,
          baseY: py,
          vx: 0,
          vy: 0,
          size: 1.2 + Math.random() * 1,
          alpha: 0.4 + Math.random() * 0.5,
          type: "right",
          phase: Math.random() * Math.PI * 2,
        });
      });

      // Hearts between the figures
      const heartCX = (leftX + rightX) / 2;
      const heartCY = centerY - 20;
      for (let i = 0; i < 3; i++) {
        const hSize = 6 + i * 3;
        const hx = heartCX + (i - 1) * 30;
        const hy = heartCY - 30 + i * 15;
        const heartPts = getHeartPoints(hx, hy, hSize);
        heartPts.forEach(([px, py]) => {
          particles.push({
            x: px + (Math.random() - 0.5) * 100,
            y: py + (Math.random() - 0.5) * 100,
            baseX: px,
            baseY: py,
            vx: 0,
            vy: 0,
            size: 1 + Math.random() * 0.8,
            alpha: 0,
            type: "heart",
            phase: Math.random() * Math.PI * 2,
          });
        });
      }

      // Background floating dots
      const bgCount = isMobile ? 60 : 120;
      for (let i = 0; i < bgCount; i++) {
        const px = Math.random() * w;
        const py = Math.random() * h;
        particles.push({
          x: px,
          y: py,
          baseX: px,
          baseY: py,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: 0.5 + Math.random() * 1.5,
          alpha: 0.05 + Math.random() * 0.15,
          type: "bg",
          phase: Math.random() * Math.PI * 2,
        });
      }

      particlesRef.current = particles;
    };

    const draw = () => {
      timeRef.current += 0.008;
      const t = timeRef.current;
      frameRef.current++;

      ctx.clearRect(0, 0, w, h);

      // Draw dot grid background
      ctx.fillStyle = "rgba(255,255,255,0.015)";
      const gridSize = 24;
      for (let gx = 0; gx < w; gx += gridSize) {
        for (let gy = 0; gy < h; gy += gridSize) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw ripples
      rippleRef.current = rippleRef.current.filter((r) => r.t < 1);
      rippleRef.current.forEach((r) => {
        r.t += 0.02;
        r.r += 3;
        const alpha = 0.15 * (1 - r.t);
        ctx.strokeStyle = `rgba(255, 100, 120, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
      });

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // How far into the "approach" animation we are
      const approachProgress = Math.min(t * 0.15, 1);
      const heartAlpha = Math.max(0, (approachProgress - 0.5) * 2);

      particlesRef.current.forEach((p) => {
        // Target positions: silhouettes drift toward each other
        let targetX = p.baseX;
        let targetY = p.baseY;

        if (p.type === "left") {
          targetX = p.baseX + approachProgress * 25;
        } else if (p.type === "right") {
          targetX = p.baseX - approachProgress * 25;
        }

        if (p.type === "bg") {
          p.x += p.vx;
          p.y += p.vy;
          // Wrap around
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10;
          if (p.y > h + 10) p.y = -10;
        } else {
          // Spring toward target
          const dx = targetX - p.x;
          const dy = targetY - p.y;
          p.vx += dx * 0.02;
          p.vy += dy * 0.02;
          p.vx *= 0.92;
          p.vy *= 0.92;

          // Mouse repulsion
          const mdx = p.x - mx;
          const mdy = p.y - my;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDist < 80) {
            const force = (80 - mDist) / 80;
            p.vx += (mdx / mDist) * force * 2;
            p.vy += (mdy / mDist) * force * 2;
          }

          p.x += p.vx;
          p.y += p.vy;
        }

        // Breathing / floating
        const breathe = Math.sin(t * 2 + p.phase) * 1.5;

        let drawAlpha = p.alpha;
        let color = "255,255,255";

        if (p.type === "heart") {
          drawAlpha = heartAlpha * (0.5 + Math.sin(t * 3 + p.phase) * 0.3);
          color = "255,100,120";
        } else if (p.type === "left" || p.type === "right") {
          drawAlpha = p.alpha * (0.6 + Math.sin(t + p.phase) * 0.15);
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y + breathe, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${drawAlpha})`;
        ctx.fill();

        // Subtle glow for heart particles
        if (p.type === "heart" && drawAlpha > 0.1) {
          ctx.beginPath();
          ctx.arc(p.x, p.y + breathe, p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 100, 120, ${drawAlpha * 0.08})`;
          ctx.fill();
        }
      });

      animId = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      rippleRef.current.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        t: 0,
        r: 0,
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.touches[0].clientX - rect.left;
      mouseRef.current.y = e.touches[0].clientY - rect.top;
    };

    resize();
    draw();

    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("touchmove", handleTouchMove);
    };
  }, [getPersonPoints, getHeartPoints]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ touchAction: "none" }}
    />
  );
};

export default DotParticleCanvas;
