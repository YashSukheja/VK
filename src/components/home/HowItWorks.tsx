import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect, useRef, useState } from 'react'

gsap.registerPlugin(ScrollTrigger)

// A winding path in a 400 x 1000 box, through one bend per step.
const PATH = 'M200 0 C200 50 80 40 80 100 C80 230 320 220 320 350 C320 480 80 470 80 600 C80 730 320 720 320 850 C320 930 200 950 200 1000'
const STEPS = [
  { x: 80, y: 100, title: 'Pick', text: 'Browse the rack and choose your size. Every piece is checked by hand.' },
  { x: 320, y: 350, title: 'Book', text: 'Book it online in a minute. Nothing to pay yet.' },
  { x: 80, y: 600, title: 'Pick up', text: 'Collect it from the store within 48 hours. We keep it aside for you.' },
  { x: 320, y: 850, title: 'Pay', text: 'See it in your hands, then pay cash or UPI.' },
]

/** "How it works": a black line draws itself down a winding path as you scroll, lighting up each step it reaches. */
export function HowItWorks() {
  const root = useRef<HTMLElement>(null)
  const line = useRef<SVGPathElement>(null)
  const [reached, setReached] = useState(STEPS.length)

  useLayoutEffect(() => {
    const path = line.current
    if (!path || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Where along the line each step sits (0 to 1), found by walking the path.
    const total = path.getTotalLength()
    const marks = STEPS.map((s) => {
      let best = 0
      for (let l = 0; l <= total; l += total / 400) if (Math.abs(path.getPointAtLength(l).y - s.y) < Math.abs(path.getPointAtLength(best).y - s.y)) best = l
      return best / total
    })
    setReached(0)
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: 'top 65%',
      end: 'bottom 75%',
      scrub: 0.4,
      onUpdate: (self) => {
        path.style.strokeDashoffset = String(1 - self.progress)
        setReached(marks.filter((m) => self.progress >= m - 0.01).length)
      },
    })
    path.style.strokeDashoffset = '1'
    return () => {
      st.kill()
      path.style.strokeDashoffset = ''
    }
  }, [])

  return (
    <section ref={root} aria-labelledby="how" className="mx-auto max-w-6xl px-5 pt-16 md:pt-24">
      <h2 id="how" className="m-0 font-display text-[28px] font-black uppercase leading-none md:text-5xl">
        Four steps,
        <br />
        then it's yours
      </h2>
      <div className="relative mt-6 h-[900px] md:h-[1000px]">
        <svg viewBox="0 0 400 1000" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path d={PATH} fill="none" stroke="#dcdcd8" strokeWidth={14} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path ref={line} d={PATH} fill="none" stroke="#0b0b0b" strokeWidth={14} strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1" />
        </svg>
        <ol className="m-0 list-none p-0">
          {STEPS.map((s, i) => {
            const on = i < reached
            const left = s.x < 200
            return (
              <li
                key={s.title}
                className="absolute flex items-start gap-3"
                style={{ top: `${s.y / 10}%`, ...(left ? { left: `${s.x / 4}%` } : { right: `${100 - s.x / 4}%` }), flexDirection: left ? 'row' : 'row-reverse', transform: 'translateY(-22px)' }}
              >
                <span
                  className={`flex size-11 flex-none -translate-x-1/2 items-center justify-center rounded-full font-display text-sm font-black transition-colors duration-300 ${left ? '' : 'translate-x-1/2'} ${on ? 'bg-ink text-white' : 'bg-[#dcdcd8] text-muted'}`}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className={`w-[46vw] max-w-72 transition-all duration-500 ${left ? '' : 'text-right'} ${on ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
                >
                  <span className="block font-display text-2xl font-black uppercase leading-none md:text-4xl">{s.title}</span>
                  <span className="mt-1.5 block text-sm leading-snug text-body md:text-base">{s.text}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
