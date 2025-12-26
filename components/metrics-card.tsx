import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function MetricsCard({
  label,
  ms,
  scheduledCount,
  unscheduledCount,
  utilization,
}: {
  label: string
  ms: number
  scheduledCount: number
  unscheduledCount: number
  utilization: { hallIndex: number; percent: number }[]
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{label} Metrics</CardTitle>
      </CardHeader>
      <CardContent className="text-sm grid grid-cols-2 gap-2">
        <div>
          <span className="font-medium">Time (ms):</span> {ms.toFixed(2)}
        </div>
        <div>
          <span className="font-medium">Scheduled:</span> {scheduledCount}
        </div>
        <div>
          <span className="font-medium">Unscheduled:</span> {unscheduledCount}
        </div>
        <div className="col-span-2 space-y-1">
          <div className="font-medium">Hall Utilization</div>
          {utilization.length === 0 && <div className="text-muted-foreground">—</div>}
          {utilization.map((u) => (
            <div key={u.hallIndex} className="flex items-center gap-2">
              <span className="w-20 text-xs">Hall {u.hallIndex + 1}</span>
              <div className="h-2 flex-1 rounded bg-secondary overflow-hidden">
                <div
                  className="h-2"
                  style={{ width: `${u.percent.toFixed(1)}%`, backgroundColor: "var(--color-chart-2)" }}
                />
              </div>
              <span className="w-14 text-right text-xs">{u.percent.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default MetricsCard
