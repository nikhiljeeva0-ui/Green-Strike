import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { LANDING_IMAGES } from '../lib/storage';

// Deterministic 18-week x 7-day illustration pattern (never Math.random)
const MINI_PATTERN: number[][] = [
  [1, 1, 0, 1, 1, 1, 0],
  [1, 1, 1, 1, 0, 1, 1],
  [0, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 0, 1, 1, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 1, 1, 1, 1],
  [1, 1, 1, 1, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 0, 0],
];

const HEADLINE_WORDS = ['Make', 'every', 'day', 'count.'];

export function HeroSection() {
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });
  const parallaxY = useTransform(
    scrollYProgress,
    [0, 1],
    reduced || !isDesktop ? ['0%', '0%'] : ['0%', '8%']
  );

  const primaryHref = user ? '/dashboard' : '/auth?tab=signup';
  const streakLabel = useMemo(() => '24-day streak', []);

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28"
    >
      {/* Subtle drifting organic leaf accents (SVG, 6-10% opacity) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -left-24 md:-top-10 md:-left-16 w-72 h-72 opacity-[0.04] md:opacity-[0.07] text-[var(--bright)] gs-leaf-drift-a"
      >
        <svg viewBox="0 0 200 200" fill="currentColor" className="w-full h-full">
          <path d="M165 25C100 28 45 78 35 162c84-10 134-65 130-137zm-98 112c24-28 54-56 84-78-22 30-50 60-84 78z" />
        </svg>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none hidden md:block absolute bottom-10 right-8 w-56 h-56 opacity-[0.06] text-[var(--emerald)] gs-leaf-drift-b"
      >
        <svg viewBox="0 0 200 200" fill="currentColor" className="w-full h-full">
          <path d="M35 30c65 4 120 55 130 138-82-10-134-65-130-138zm98 110c-26-30-56-58-84-78 22 30 50 58 84 78z" />
        </svg>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Copy Column (7 cols) */}
          <div className="lg:col-span-7">
            <motion.div
              initial={reduced ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: reduced ? 0 : 0.15 }}
              className="text-xs font-medium tracking-[0.18em] text-[var(--text-muted)] uppercase"
            >
              Every Day Counts
            </motion.div>

            <h1 className="mt-4 font-serif-editorial text-[clamp(3rem,9vw,6.25rem)] leading-[0.95] tracking-[-0.03em] text-[var(--text)] text-balance">
              {HEADLINE_WORDS.map((word, idx) => (
                <motion.span
                  key={word}
                  initial={reduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: reduced ? 0 : 0.25 + idx * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="inline-block mr-[0.22em]"
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={reduced ? { opacity: 1 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.45,
                delay: reduced ? 0 : 0.65,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-6 text-base sm:text-lg text-[var(--text-2)] max-w-xl leading-relaxed"
            >
              Build better habits. Show up consistently. Watch your progress grow, one green dot at a time.
            </motion.p>

            <motion.div
              initial={reduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.45,
                delay: reduced ? 0 : 0.8,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-8 flex flex-wrap items-center gap-3.5"
            >
              <Link
                to={primaryHref}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-full bg-[var(--emerald)] text-white text-sm font-medium hover:brightness-110 transition-all whitespace-nowrap shrink-0"
              >
                <span>Start Your Journey</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a
                href="#the-calendar"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm font-medium hover:border-[var(--text-2)] transition-colors whitespace-nowrap shrink-0"
              >
                <span>Explore the Calendar</span>
                <ArrowDown size={15} aria-hidden="true" />
              </a>
            </motion.div>

            <motion.p
              initial={reduced ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: reduced ? 0 : 0.9 }}
              className="mt-6 text-sm font-medium text-[var(--gold)]"
            >
              Created by Nikhil Jeeva
            </motion.p>
          </div>

          {/* Right Media Column (5 cols) */}
          <div className="lg:col-span-5 relative">
            <motion.div
              initial={reduced ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-[24px] overflow-hidden border border-[var(--border)] bg-[var(--bg-2)] aspect-[4/5] md:aspect-[5/6]"
            >
              <motion.img
                src={LANDING_IMAGES.heroForest}
                alt="Sunlit green forest canopy"
                width={900}
                height={1080}
                fetchPriority="high"
                decoding="async"
                referrerPolicy="no-referrer"
                style={{ y: parallaxY }}
                className="w-full h-full object-cover scale-105"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none"
              />
            </motion.div>

            {/* Overlapping deterministic calendar illustration */}
            <motion.div
              initial={reduced ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: reduced ? 0 : 0.95,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-4 lg:mt-0 lg:absolute lg:-left-12 lg:bottom-8 rounded-[20px] border border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-md p-4 shadow-xl max-w-full lg:w-[320px]"
            >
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-medium text-[var(--text)]">Daily Writing</span>
                <span className="text-[var(--bright)] font-medium tabular-nums">
                  {streakLabel}
                </span>
              </div>
              <div
                className="grid gap-[3px]"
                style={{
                  gridTemplateColumns: `repeat(${MINI_PATTERN.length}, minmax(0, 1fr))`,
                }}
                aria-hidden="true"
              >
                {MINI_PATTERN.map((col, colIdx) => (
                  <div key={colIdx} className="flex flex-col gap-[3px]">
                    {col.map((cell, rowIdx) => (
                      <motion.span
                        key={rowIdx}
                        initial={reduced ? { opacity: 1 } : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          duration: 0.25,
                          delay: reduced ? 0 : 0.95 + colIdx * 0.006,
                        }}
                        className={`w-full aspect-square rounded-[2px] ${
                          cell === 1 ? 'bg-[var(--bright)]' : 'bg-[var(--cell-empty)]'
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span>Illustration</span>
                <span>One habit, one grid</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
