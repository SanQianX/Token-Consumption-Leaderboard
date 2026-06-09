import type { RingMetrics } from "@/lib/coach"
import { cn } from "@/lib/utils"

interface TokenRingsProps {
  metrics: Pick<RingMetrics, "volumeProgress" | "deepWorkScore" | "consistencyProgress">
  size?: number
  strokeWidth?: number
  interactive?: boolean
  selected?: boolean
  label?: string
  onClick?: () => void
}

const RINGS = [
  {
    key: "volumeProgress",
    color: "var(--ring-volume)",
    radiusOffset: 0,
  },
  {
    key: "deepWorkScore",
    color: "var(--ring-deep-work)",
    radiusOffset: 18,
  },
  {
    key: "consistencyProgress",
    color: "var(--ring-consistency)",
    radiusOffset: 36,
  },
] as const

function RingTrack({
  radius,
  strokeWidth,
  progress,
  color,
  center,
}: {
  radius: number
  strokeWidth: number
  progress: number
  color: string
  center: number
}) {
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.max(0, Math.min(100, progress)) / 100) * circumference

  return (
    <>
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--ring-track)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
      />
    </>
  )
}

export function TokenRings({
  metrics,
  size = 220,
  strokeWidth = 12,
  interactive = false,
  selected = false,
  label,
  onClick,
}: TokenRingsProps) {
  const center = size / 2
  const outerRadius = center - strokeWidth / 2

  const content = (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="block max-w-full"
      role="img"
      aria-label={label ?? "Token usage rings"}
    >
      {RINGS.map((ring) => (
        <RingTrack
          key={ring.key}
          center={center}
          radius={outerRadius - ring.radiusOffset}
          strokeWidth={strokeWidth}
          progress={metrics[ring.key]}
          color={ring.color}
        />
      ))}
    </svg>
  )

  if (!interactive) return content

  return (
    <button
      type="button"
      aria-label={label ?? "Select ring day"}
      onClick={onClick}
      className={cn(
        "rounded-full p-1 outline-none transition hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-ring",
        selected && "scale-[1.03] ring-1 ring-[var(--brand-accent)]/45",
      )}
    >
      {content}
    </button>
  )
}
