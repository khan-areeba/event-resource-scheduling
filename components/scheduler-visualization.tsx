import type { AllocationResult, HallSchedule, ScheduledEvent } from "@/lib/scheduler"

export function SchedulerVisualization({
  title,
  allocation,
  minStart,
  maxEnd,
}: {
  title: string
  allocation: AllocationResult
  minStart: number
  maxEnd: number
}) {
  const range = Math.max(1, maxEnd - minStart)

  const palette = [
    "var(--color-chart-1)",
    "var(--color-chart-2)",
    "var(--color-chart-3)",
    "var(--color-chart-4)",
    "var(--color-chart-5)",
  ]

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="rounded-md border p-3">
        <div className="space-y-3">
          {allocation.scheduled.map((hall: HallSchedule, idx: number) => (
            <div key={hall.hallIndex} className="space-y-1">
              <div className="text-xs text-muted-foreground">Hall {hall.hallIndex + 1}</div>
              <div className="relative h-10 w-full rounded bg-secondary">
                {hall.events.map((e: ScheduledEvent, i: number) => {
                  const left = ((e.start - minStart) / range) * 100
                  const width = ((e.end - e.start) / range) * 100
                  const color = palette[i % palette.length]
                  return (
                    <div
                      key={`${e.id}-${i}`}
                      className="absolute top-1/2 -translate-y-1/2 h-7 rounded-md border text-xs flex items-center justify-center"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        backgroundColor: color,
                        color: "var(--color-primary-foreground)",
                        borderColor: "var(--color-border)",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                      title={`${e.id}: ${e.start}–${e.end}`}
                    >
                      <span className="px-2">{`${e.id} (${e.start}-${e.end})`}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {allocation.scheduled.length === 0 && (
            <div className="text-sm text-muted-foreground">No halls or schedule available.</div>
          )}
        </div>
        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          <span>Start: {minStart}</span>
          <span>End: {maxEnd}</span>
        </div>
      </div>
    </div>
  )
}

export default SchedulerVisualization
