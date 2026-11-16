import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { LANDING_IMAGES } from '../lib/storage';
import { HeroSection } from '../components/HeroSection';
import { BrandWordmark, MainNavigation } from '../components/MainNavigation';

// Deterministic 52-week x 7-day sample pattern for Section 3 ("Illustration")
const SAMPLE_WEEKS: number[][] = Array.from({ length: 52 }, (_, w) =>
  Array.from({ length: 7 }, (_, d) => {
    if (w === 51 && d > 4) return 0;
    const score = (w * 7 + d * 3 + (w % 5)) % 11;
    if (w > 44) return score === 0 ? 0 : 1;
    if (w > 26) return score <= 2 ? 0 : 1;
    return score <= 4 ? 0 : 1;
  })
);

const MONTH_HEADER = [
  'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov',
];

const STEPS = [
  {
    num: '01',
    title: 'Create a habit',
    line: 'Name the single daily action you want to keep.',
  },
  {
    num: '02',
    title: 'Show up',
    line: 'Do the work today—even when it is quiet and small.',
  },
  {
    num: '03',
    title: 'Get your green dot',
    line: 'Mark the day complete and watch each habit grow its own year.',
  },
];

export function LandingPage() {
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const ctaHref = user ? '/dashboard' : '/auth?tab=signup';

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <MainNavigation variant="landing" />

      <main>
        {/* 1. Hero */}
        <HeroSection />

        {/* 2. How it works */}
        <section
          id="how-it-works"
          className="mx-auto max-w-[1200px] px-4 sm:px-6 py-20 sm:py-28 border-t border-[var(--border)]"
        >
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="font-serif-editorial text-[clamp(2rem,5vw,3.75rem)] leading-tight text-[var(--text)] text-balance">
              Simple by design.
            </h2>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={reduced ? { opacity: 1 } : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{
                  duration: 0.5,
                  delay: reduced ? 0 : i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7"
              >
                <div className="text-xs font-medium tracking-widest text-[var(--bright)] tabular-nums">
                  {step.num}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-[var(--text)]">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-sm sm:text-base text-[var(--text-2)] leading-relaxed">
                  {step.line}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 3. The calendar */}
        <section
          id="the-calendar"
          className="mx-auto max-w-[1200px] px-4 sm:px-6 py-20 sm:py-28 border-t border-[var(--border)]"
        >
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <h2 className="font-serif-editorial text-[clamp(2rem,5vw,3.75rem)] leading-tight text-[var(--text)] text-balance">
              Every habit gets its own calendar.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[var(--text-2)] leading-relaxed">
              Nothing is merged into a noisy score. Each practice owns an honest, full-year grid showing only the days you showed up.
            </p>
          </motion.div>

          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
              <div>
                <div className="text-xs font-medium text-[var(--text-muted)]">
                  Sample Habit
                </div>
                <div className="text-lg font-semibold text-[var(--text)] mt-0.5">
                  Morning Workout
                </div>
              </div>
              <div className="text-xs text-[var(--text-muted)]">Illustration</div>
            </div>

            <div className="mt-6 gs-cal-scroll overflow-x-auto pb-2">
              <div className="min-w-[720px]">
                <div className="flex justify-between pl-10 pr-2 mb-2 text-[11px] text-[var(--text-muted)]">
                  {MONTH_HEADER.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col justify-between text-[11px] text-[var(--text-muted)] w-7 py-0.5 select-none">
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                    <span>Sun</span>
                  </div>
                  <div
                    className="grid gap-[3px] flex-1"
                    style={{
                      gridTemplateColumns: `repeat(${SAMPLE_WEEKS.length}, minmax(10px, 1fr))`,
                    }}
                    aria-label="Illustration of a full-year habit calendar"
                  >
                    {SAMPLE_WEEKS.map((col, colIdx) => (
                      <div key={colIdx} className="flex flex-col gap-[3px]">
                        {col.map((cell, rowIdx) => (
                          <span
                            key={rowIdx}
                            className={`w-full aspect-square rounded-[3px] ${
                              cell === 1
                                ? 'bg-[var(--bright)]'
                                : 'bg-[var(--cell-empty)]'
                            }`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--bright)] inline-block" />
                  Completed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--cell-empty)] inline-block" />
                  Not completed
                </span>
              </div>
              <span>Illustration</span>
            </div>
          </motion.div>
        </section>

        {/* 4. Editorial photo band */}
        <section className="mx-auto max-w-[1200px] px-4 sm:px-6 py-10">
          <motion.div
            initial={
              reduced
                ? { opacity: 1 }
                : { clipPath: 'inset(0 0 100% 0)', opacity: 0.7 }
            }
            whileInView={
              reduced
                ? { opacity: 1 }
                : { clipPath: 'inset(0 0 0% 0)', opacity: 1 }
            }
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-[24px] overflow-hidden border border-[var(--border)] aspect-[16/9] sm:aspect-[21/9] bg-[var(--bg-2)]"
          >
            <img
              src={LANDING_IMAGES.bandLeaves}
              alt="Green forest leaves illuminated by morning sunlight"
              width={1600}
              height={686}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/25"
            />
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <p className="font-serif-editorial text-3xl sm:text-5xl md:text-6xl text-white tracking-tight text-balance">
                Growth is quiet. It happens daily.
              </p>
            </div>
          </motion.div>
        </section>

        {/* 5. Final CTA */}
        <section className="mx-auto max-w-[1200px] px-4 sm:px-6 py-24 sm:py-32 text-center">
          <h2 className="font-serif-editorial text-[clamp(2.25rem,5vw,4rem)] leading-tight text-[var(--text)] text-balance">
            Every day counts.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[var(--text-2)] max-w-md mx-auto">
            Start with one habit today and let the calendar tell the truth.
          </p>
          <div className="mt-8">
            <Link
              to={ctaHref}
              className="inline-flex items-center justify-center gap-2 px-7 py-4 min-h-[48px] rounded-full bg-[var(--emerald)] text-white text-sm font-medium hover:brightness-110 transition-all whitespace-nowrap"
            >
              <span>Start Your Journey</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      {/* 6. Footer */}
      <footer className="border-t border-[var(--border)] py-10">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <BrandWordmark />
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm">
            <span className="text-[var(--gold)] font-medium">
              Created by Nikhil Jeeva
            </span>
            <span aria-hidden="true" className="text-[var(--border)]">·</span>
            <span className="text-[var(--text-muted)]">
              Botanical imagery generated for GREENSTRIKE
            </span>
            <span aria-hidden="true" className="text-[var(--border)]">·</span>
            <Link
              to={user ? '/dashboard' : '/auth?tab=login'}
              className="text-[var(--text-2)] hover:text-[var(--text)] transition-colors py-1"
            >
              {user ? 'Open Dashboard' : 'Log in'}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
