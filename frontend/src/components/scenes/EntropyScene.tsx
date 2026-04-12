import type { ReactElement } from "react"
import { useMemo, useRef } from "react"
import { TeachableEquation } from "../teaching/TeachableEquation"
import { useLessonCopy } from "../teaching/lessonContent"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"
import { interpolateSceneCopy, useSceneCopy } from "../../data/sceneCopy"
import { useContainerSize } from "../../hooks/useContainerSize"

/* ── constants ── */
const VIEWBOX_WIDTH = 1400
const VIEWBOX_HEIGHT = 920
const CHAMBER = { x: 88, y: 172, width: 1224, height: 568 }
const GRID_COLS = 6
const GRID_ROWS = 4
const PARTICLE_COUNT = GRID_COLS * GRID_ROWS
const PARTICLE_RADIUS = 11
const PARTICLE_COLORS = ["#5f7cff", "#6bd0ad"] as const

/* ── types ── */
interface Point {
  x: number
  y: number
}

interface Particle extends Point {
  group: 0 | 1
}

/* ── math helpers ── */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function seededRandom(seed: number): () => number {
  let current = seed >>> 0
  return () => {
    current = (current * 1664525 + 1013904223) >>> 0
    return current / 4294967296
  }
}

function mixHex(start: string, end: string, amount: number): string {
  const t = clamp(amount, 0, 1)
  const [sr, sg, sb] = [start.slice(1, 3), start.slice(3, 5), start.slice(5, 7)].map((value) => Number.parseInt(value, 16))
  const [er, eg, eb] = [end.slice(1, 3), end.slice(3, 5), end.slice(5, 7)].map((value) => Number.parseInt(value, 16))
  const blend = (from: number, to: number) => Math.round(from + (to - from) * t).toString(16).padStart(2, "0")
  return `#${blend(sr, er)}${blend(sg, eg)}${blend(sb, eb)}`
}

function buildOrderedParticles(): Particle[] {
  const paddingX = 164
  const paddingY = 146
  const stepX = (CHAMBER.width - paddingX * 2) / (GRID_COLS - 1)
  const stepY = (CHAMBER.height - paddingY * 2) / (GRID_ROWS - 1)

  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const col = index % GRID_COLS
    const row = Math.floor(index / GRID_COLS)
    return {
      x: CHAMBER.x + paddingX + col * stepX,
      y: CHAMBER.y + paddingY + row * stepY,
      group: row < GRID_ROWS / 2 ? 0 : 1,
    }
  })
}

function buildMicrostate(
  ordered: Particle[],
  temperature: number,
  stateIndex: number,
  stateCount: number,
): Particle[] {
  const temp = temperature / 100
  const intensity = temp * (0.3 + (stateIndex / Math.max(stateCount - 1, 1)) * 0.9)
  const thermalRadius = 6 + temp * 86
  const swirlRadius = temp * temp * 44
  const jitter = temp * 14
  const rng = seededRandom(9001 + stateIndex * 811)

  return ordered.map((particle, particleIndex) => {
    const angle = rng() * Math.PI * 2 + particleIndex * 0.41
    const radial = thermalRadius * (0.28 + rng() * 0.72) * intensity
    const orbitX = Math.cos(angle) * radial + Math.sin(stateIndex * 0.45 + particleIndex) * swirlRadius
    const orbitY = Math.sin(angle) * radial + Math.cos(stateIndex * 0.37 + particleIndex * 0.5) * swirlRadius * 0.65
    const noiseX = (rng() - 0.5) * jitter * 2
    const noiseY = (rng() - 0.5) * jitter * 2

    return {
      x: clamp(particle.x + orbitX + noiseX, CHAMBER.x + 40, CHAMBER.x + CHAMBER.width - 40),
      y: clamp(particle.y + orbitY + noiseY, CHAMBER.y + 40, CHAMBER.y + CHAMBER.height - 40),
      group: particle.group,
    }
  })
}

function microstateCountForTemperature(temperature: number): number {
  return Math.max(1, Math.round(Math.exp(temperature / 15)))
}

function entropyForTemperature(temperature: number): number {
  return Math.log(microstateCountForTemperature(temperature))
}

function visualStateCountForTemperature(temperature: number): number {
  return Math.max(1, Math.min(14, Math.round(1 + temperature / 8)))
}

/* ── teaching config ── */
const variables: Variable[] = [
  {
    name: 'temperature',
    symbol: 'T',
    latex: 'T',
    value: 20,
    min: 0,
    max: 100,
    step: 1,
    color: VAR_COLORS.primary,
    description: 'Temperature (drives disorder)',
  },
]

function buildLessons(lessonCopy: Record<string, Pick<LessonStep, "instruction" | "hint" | "insight">>): LessonStep[] {
  return [
  {
    id: 'order',
    instruction: lessonCopy.order.instruction,
    highlightElements: ['temperature'],
    unlockedVariables: ['temperature'],
    successCondition: { type: 'time_elapsed', duration: 5000 },
    celebration: 'subtle',
    insight: lessonCopy.order.insight,
  },
  {
    id: 'heat',
    instruction: lessonCopy.heat.instruction,
    highlightElements: ['temperature'],
    unlockedVariables: ['temperature'],
    successCondition: { type: 'variable_changed', target: 'temperature' },
    celebration: 'subtle',
    insight: lessonCopy.heat.insight,
  },
  {
    id: 'arrow',
    instruction: lessonCopy.arrow.instruction,
    highlightElements: ['temperature'],
    unlockedVariables: ['temperature'],
    successCondition: { type: 'value_reached', target: 'temperature', value: 100, tolerance: 5 },
    celebration: 'medium',
    insight: lessonCopy.arrow.insight,
  },
  {
    id: 'irreversible',
    instruction: lessonCopy.irreversible.instruction,
    highlightElements: ['temperature'],
    unlockedVariables: ['temperature'],
    successCondition: { type: 'value_reached', target: 'temperature', value: 0, tolerance: 5 },
    celebration: 'big',
    insight: lessonCopy.irreversible.insight,
  },
  ]
}

/* ── visual component ── */
interface EntropyVisualProps {
  temperature: number
}

function EntropyVisual({ temperature }: EntropyVisualProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const { width, height } = useContainerSize(containerRef)
  const compact = width > 0 && (width < 460 || height < 420)
  const ultraCompact = width > 0 && (width < 390 || height < 360)
  const orderedParticles = useMemo(() => buildOrderedParticles(), [])
  const visualStateCount = useMemo(() => visualStateCountForTemperature(temperature), [temperature])
  const microstateCloud = useMemo(
    () => Array.from({ length: visualStateCount }, (_, index) => buildMicrostate(orderedParticles, temperature, index, visualStateCount)),
    [orderedParticles, temperature, visualStateCount],
  )
  const currentMicrostate = microstateCloud[microstateCloud.length - 1] ?? orderedParticles
  const visibleGhostStates = ultraCompact
    ? microstateCloud.slice(-Math.min(3, microstateCloud.length))
    : compact
      ? microstateCloud.slice(-Math.min(5, microstateCloud.length))
      : microstateCloud
  const thermalAccent = useMemo(() => mixHex("#6f87ff", "#f7a85d", temperature / 100), [temperature])
  const hazeAccent = useMemo(() => mixHex("#8ea8ff", "#ffcb8a", temperature / 100), [temperature])

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="h-full w-full"
        role="img"
        aria-label="Particles exploring more arrangements as temperature increases"
      >
        <defs>
          <radialGradient id="entropy-bg" cx="50%" cy="15%" r="85%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#f6f8fd" />
            <stop offset="100%" stopColor="#eef2fb" />
          </radialGradient>
          <radialGradient id="thermal-haze" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={hazeAccent} stopOpacity="0.34" />
            <stop offset="100%" stopColor={hazeAccent} stopOpacity="0" />
          </radialGradient>
          <filter id="blur-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
          <linearGradient id="heat-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7d92ff" stopOpacity="0.2" />
            <stop offset="50%" stopColor={thermalAccent} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffdfb0" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="url(#entropy-bg)" />
        <circle cx={VIEWBOX_WIDTH * 0.5} cy={VIEWBOX_HEIGHT * 0.48} r={VIEWBOX_WIDTH * 0.3} fill="url(#thermal-haze)" opacity={0.7} />

        <rect
          x={CHAMBER.x}
          y={CHAMBER.y}
          width={CHAMBER.width}
          height={CHAMBER.height}
          rx="42"
          fill="rgba(255,255,255,0.68)"
          stroke="rgba(148,163,184,0.22)"
          strokeWidth="2"
        />

        {!ultraCompact && Array.from({ length: GRID_ROWS }).map((_, row) => {
          const y = orderedParticles[row * GRID_COLS].y
          return (
            <line
              key={`row-${row}`}
              x1={orderedParticles[row * GRID_COLS].x}
              x2={orderedParticles[row * GRID_COLS + GRID_COLS - 1].x}
              y1={y}
              y2={y}
              stroke="rgba(148,163,184,0.13)"
              strokeWidth="1"
              strokeDasharray="2 12"
            />
          )
        })}
        {!ultraCompact && Array.from({ length: GRID_COLS }).map((_, col) => {
          const top = orderedParticles[col]
          const bottom = orderedParticles[(GRID_ROWS - 1) * GRID_COLS + col]
          return (
            <line
              key={`col-${col}`}
              x1={top.x}
              x2={top.x}
              y1={top.y}
              y2={bottom.y}
              stroke="rgba(148,163,184,0.13)"
              strokeWidth="1"
              strokeDasharray="2 12"
            />
          )
        })}

        {orderedParticles.map((particle, index) => (
          <circle
            key={`ordered-${index}`}
            cx={particle.x}
            cy={particle.y}
            r={ultraCompact ? PARTICLE_RADIUS - 1.5 : PARTICLE_RADIUS}
            fill="none"
            stroke={particle.group === 0 ? "rgba(95,124,255,0.25)" : "rgba(107,208,173,0.25)"}
            strokeWidth="2"
          />
        ))}

        {visibleGhostStates.slice(0, -1).map((state, stateIndex) => (
          <g key={`state-${stateIndex}`} opacity={ultraCompact ? 0.06 + stateIndex * 0.05 : compact ? 0.08 + stateIndex * 0.04 : 0.06 + stateIndex * 0.03}>
            {state.map((particle, particleIndex) => (
              <circle
                key={`ghost-${stateIndex}-${particleIndex}`}
                cx={particle.x}
                cy={particle.y}
                r={ultraCompact ? PARTICLE_RADIUS - 1.5 : PARTICLE_RADIUS}
                fill={PARTICLE_COLORS[particle.group]}
              />
            ))}
          </g>
        ))}

        {currentMicrostate.map((particle, index) => (
          <g key={`current-${index}`}>
            <circle
              cx={particle.x}
              cy={particle.y}
              r={ultraCompact ? PARTICLE_RADIUS * 1.9 : compact ? PARTICLE_RADIUS * 2.25 : PARTICLE_RADIUS * 2.7}
              fill={PARTICLE_COLORS[particle.group]}
              opacity={ultraCompact ? 0.13 + (temperature / 100) * 0.08 : 0.16 + (temperature / 100) * 0.1}
              filter="url(#blur-glow)"
            />
            <circle
              cx={particle.x}
              cy={particle.y}
              r={ultraCompact ? PARTICLE_RADIUS - 1.5 : PARTICLE_RADIUS}
              fill={PARTICLE_COLORS[particle.group]}
              stroke="rgba(255,255,255,0.95)"
              strokeWidth={compact ? "2" : "2.5"}
            />
          </g>
        ))}

        {!ultraCompact && (
          <line
            x1={CHAMBER.x + 54}
            x2={CHAMBER.x + CHAMBER.width - 54}
            y1={CHAMBER.y + CHAMBER.height + 48}
            y2={CHAMBER.y + CHAMBER.height + 48}
            stroke="url(#heat-line)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity={0.9}
          />
        )}
      </svg>
    </div>
  )
}

/* ── scene ── */
export function EntropyScene(): ReactElement {
  const lessonCopy = useLessonCopy("entropy")
  const sceneCopy = useSceneCopy("entropy")
  const lessons = buildLessons(lessonCopy)
  return (
    <TeachableEquation
      hook="Why can't you unscramble an egg? The Second Law says entropy — the number of ways particles can arrange themselves — never decreases."
      hookAction="Drag the temperature to watch order dissolve into chaos."
      formula="dS \\ge 0"
      variables={variables}
      lessonSteps={lessons}
      buildLiveFormula={(v) => {
        const omega = microstateCountForTemperature(v.temperature)
        const S = entropyForTemperature(v.temperature)
        return `S = k_B \\ln({\\color{${VAR_COLORS.primary}}${omega}}) = ${S.toFixed(3)}\\,k_B`
      }}
      buildResultLine={(v) => {
        const omega = microstateCountForTemperature(v.temperature)
        const S = entropyForTemperature(v.temperature)
        return `S = k_B \\ln(${omega}) = ${S.toFixed(3)}\\,k_B`
      }}
      describeResult={(v) => {
        const S = entropyForTemperature(v.temperature)
        if (v.temperature <= 5) return sceneCopy.description.nearPerfectOrder
        if (v.temperature <= 30) return sceneCopy.description.lowEntropy
        if (v.temperature <= 60) return sceneCopy.description.growingDisorder
        if (v.temperature <= 85) return sceneCopy.description.highEntropy
        return interpolateSceneCopy(sceneCopy.description.maximumDisorder, { entropy: S.toFixed(1) })
      }}
      presets={[
        { label: "Frozen", values: { temperature: 5 } },
        { label: "Warm", values: { temperature: 40 } },
        { label: "Hot", values: { temperature: 72 } },
        { label: "Max", values: { temperature: 100 } },
      ]}
    >
      {({ vars }) => (
        <EntropyVisual temperature={vars.temperature} />
      )}
    </TeachableEquation>
  )
}
