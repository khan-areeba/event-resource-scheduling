"use client"

import { useMemo, useState } from "react"
import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  type EventItem,
  validateEvents,
  scheduleGreedyTimed,
  scheduleBacktrackingTimed,
  type AllocationResult,
  computeUtilization,
  normalizeEvents,
  type HallSchedule,
  type ScheduledEvent,
} from "@/lib/scheduler"
import MetricsCard from "@/components/metrics-card"
import SchedulerVisualization from "@/components/scheduler-visualization"

export default function Page() {
  const [events, setEvents] = useState<EventItem[]>([
    { id: "E1", start: 1, end: 3 },
    { id: "E2", start: 2, end: 5 },
    { id: "E3", start: 4, end: 7 },
    { id: "E4", start: 6, end: 9 },
    { id: "E5", start: 8, end: 10 },
  ])
  const [halls, setHalls] = useState<number>(2)
  const [btMsLimit, setBtMsLimit] = useState<number>(500) // backtracking time limit
  const [greedyResult, setGreedyResult] = useState<AllocationResult | null>(null)
  const [backtrackingResult, setBacktrackingResult] = useState<AllocationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [randCount, setRandCount] = useState<number>(10)
  const [randStart, setRandStart] = useState<number>(0)
  const [randEnd, setRandEnd] = useState<number>(20)
  const [randMinLen, setRandMinLen] = useState<number>(1)
  const [randMaxLen, setRandMaxLen] = useState<number>(6)

  const minStart = useMemo(() => {
    const greedyStarts =
      ((greedyResult?.scheduled ?? []) as HallSchedule[])
        .flatMap((h: HallSchedule) => h.events)
        .map((e: ScheduledEvent) => e.start) ?? []
    const backtrackingStarts =
      ((backtrackingResult?.scheduled ?? []) as HallSchedule[])
        .flatMap((h: HallSchedule) => h.events)
        .map((e: ScheduledEvent) => e.start) ?? []

    const all = [...greedyStarts, ...backtrackingStarts, ...events.map((e: EventItem) => e.start)]
    return all.length ? Math.min(...all) : 0
  }, [greedyResult, backtrackingResult, events])

  const maxEnd = useMemo(() => {
    const greedyEnds =
      ((greedyResult?.scheduled ?? []) as HallSchedule[])
        .flatMap((h: HallSchedule) => h.events)
        .map((e: ScheduledEvent) => e.end) ?? []
    const backtrackingEnds =
      ((backtrackingResult?.scheduled ?? []) as HallSchedule[])
        .flatMap((h: HallSchedule) => h.events)
        .map((e: ScheduledEvent) => e.end) ?? []

    const all = [...greedyEnds, ...backtrackingEnds, ...events.map((e: EventItem) => e.end)]
    return all.length ? Math.max(...all) : 1
  }, [greedyResult, backtrackingResult, events])

  function handleAddEvent() {
    const nextNum = events.length + 1
    setEvents((prev) => [...prev, { id: `E${nextNum}`, start: 0, end: 1 }])
  }

  function handleRemoveEvent(idx: number) {
    setEvents((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleUpdateEvent(idx: number, patch: Partial<EventItem>) {
    setEvents((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)))
  }

  function handleNormalize() {
    const { normalized } = normalizeEvents(events)
    setEvents(normalized)
  }

  function handleGenerateRandom() {
    const newEvents: EventItem[] = []
    for (let i = 0; i < randCount; i++) {
      const id = `R${i + 1}`
      const s = Math.floor(Math.random() * (randEnd - randStart + 1)) + randStart
      const len = Math.max(randMinLen, Math.floor(Math.random() * (randMaxLen - randMinLen + 1)) + randMinLen)
      const e = s + len
      newEvents.push({ id, start: s, end: e })
    }
    setEvents(newEvents)
  }

  function runGreedy() {
    setError(null)
    const validation = validateEvents(events, halls)
    if (!validation.ok) {
      setError(validation.message)
      return
    }
    const res = scheduleGreedyTimed(events, halls)
    const util = computeUtilization(res, events)
    setGreedyResult({ ...res, utilization: util })
  }

  function runBacktracking() {
    setError(null)
    const validation = validateEvents(events, halls)
    if (!validation.ok) {
      setError(validation.message)
      return
    }
    const res = scheduleBacktrackingTimed(events, halls, btMsLimit)
    const util = computeUtilization(res, events)
    setBacktrackingResult({ ...res, utilization: util })
  }

  function runBoth() {
    runGreedy()
    runBacktracking()
  }

  const theoretical = {
    greedy: {
      time: "O(n log n) due to sorting; assignment O(n·H)",
      space: "O(n + H)",
    },
    backtracking: {
      time: "Exponential in worst case (roughly O(H^n)); with pruning/time-limit in practice",
      space: "O(n + H) recursion depth and assignment tracking",
    },
  }

  const comparison = useMemo(() => {
    const g = greedyResult
    const b = backtrackingResult
    return {
      gScheduled: g?.scheduledCount ?? 0,
      bScheduled: b?.scheduledCount ?? 0,
      gMs: g?.ms ?? 0,
      bMs: b?.ms ?? 0,
      gUn: g?.unscheduled.length ?? 0,
      bUn: b?.unscheduled.length ?? 0,
    }
  }, [greedyResult, backtrackingResult])

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-pretty">Event Hall Scheduling — Greedy vs Backtracking</h1>
        <p className="text-sm text-muted-foreground">
          Provide events (ID, start, end) and number of halls. Run both algorithms, visualize allocations, and compare
          performance.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Inputs</CardTitle>
          <CardDescription>
            Manage events, halls, and options. Invalid inputs are highlighted and blocked.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label htmlFor="halls">Number of halls</Label>
              <Input
                id="halls"
                type="number"
                min={1}
                value={halls}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHalls(Math.max(1, Number(e.target.value)))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="btlimit">Backtracking time limit (ms)</Label>
              <Input
                id="btlimit"
                type="number"
                min={50}
                step={50}
                value={btMsLimit}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setBtMsLimit(Math.max(50, Number(e.target.value)))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="sr-only">Normalize</Label>
              <Button className="w-full mt-6" variant="secondary" onClick={handleNormalize}>
                Normalize Events
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="sr-only">Add</Label>
              <Button className="w-full mt-6" onClick={handleAddEvent}>
                Add Event
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <div className="grid grid-cols-12 gap-2 p-3 text-sm font-medium">
              <div className="col-span-3">Event ID</div>
              <div className="col-span-4">Start</div>
              <div className="col-span-4">End</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
            <Separator />
            <div className="max-h-[320px] overflow-auto">
              {events.map((ev: EventItem, idx: number) => (
                <div key={ev.id + idx} className="grid grid-cols-12 gap-2 p-3 items-center">
                  <Input
                    className="col-span-3"
                    value={ev.id}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleUpdateEvent(idx, { id: e.target.value })
                    }
                  />
                  <Input
                    className={cn("col-span-4", ev.start < 0 ? "border-destructive" : "")}
                    type="number"
                    value={ev.start}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleUpdateEvent(idx, { start: Number(e.target.value) })
                    }
                  />
                  <Input
                    className={cn("col-span-4", ev.end <= ev.start ? "border-destructive" : "")}
                    type="number"
                    value={ev.end}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleUpdateEvent(idx, { end: Number(e.target.value) })
                    }
                  />
                  <div className="col-span-1 flex justify-end">
                    <Button variant="destructive" className="text-white" size="sm" onClick={() => handleRemoveEvent(idx)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">
                  No events yet. Click "Add Event" or generate random.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="space-y-2">
              <Label>Random count</Label>
              <Input
                type="number"
                min={1}
                value={randCount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRandCount(Math.max(1, Number(e.target.value)))}
              />
            </div>
            <div className="space-y-2">
              <Label>Range start</Label>
              <Input
                type="number"
                value={randStart}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRandStart(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Range end</Label>
              <Input
                type="number"
                value={randEnd}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRandEnd(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Min length</Label>
              <Input
                type="number"
                min={1}
                value={randMinLen}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRandMinLen(Math.max(1, Number(e.target.value)))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Max length</Label>
              <Input
                type="number"
                min={1}
                value={randMaxLen}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRandMaxLen(Math.max(1, Number(e.target.value)))
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleGenerateRandom}>
              Generate Random Events
            </Button>
            <Button onClick={runGreedy}>Run Greedy</Button>
            <Button onClick={runBacktracking}>Run Backtracking</Button>
            <Button onClick={runBoth}>Run Both</Button>
          </div>

          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="analysis">Analysis & Report</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Greedy Allocation</CardTitle>
                <CardDescription>Sort by earliest finish; assign to first available hall.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricsCard
                  label="Greedy"
                  ms={greedyResult?.ms ?? 0}
                  scheduledCount={greedyResult?.scheduledCount ?? 0}
                  unscheduledCount={greedyResult?.unscheduled.length ?? 0}
                  utilization={greedyResult?.utilization ?? []}
                />
                {greedyResult && (
                  <SchedulerVisualization
                    title="Greedy Schedule"
                    allocation={greedyResult}
                    minStart={minStart}
                    maxEnd={maxEnd}
                  />
                )}
                {greedyResult && greedyResult.unscheduled.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Unscheduled:</span>{" "}
                    {greedyResult.unscheduled.map((u: EventItem) => `${u.id}(${u.start}-${u.end})`).join(", ")}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backtracking Allocation</CardTitle>
                <CardDescription>Optimizes number of scheduled events (time-limited).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricsCard
                  label="Backtracking"
                  ms={backtrackingResult?.ms ?? 0}
                  scheduledCount={backtrackingResult?.scheduledCount ?? 0}
                  unscheduledCount={backtrackingResult?.unscheduled.length ?? 0}
                  utilization={backtrackingResult?.utilization ?? []}
                />
                {backtrackingResult && (
                  <SchedulerVisualization
                    title="Backtracking Schedule"
                    allocation={backtrackingResult}
                    minStart={minStart}
                    maxEnd={maxEnd}
                  />
                )}
                {backtrackingResult && backtrackingResult.unscheduled.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Unscheduled:</span>{" "}
                    {backtrackingResult.unscheduled.map((u: EventItem) => `${u.id}(${u.start}-${u.end})`).join(", ")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {(greedyResult || backtrackingResult) && (
            <Card>
              <CardHeader>
                <CardTitle>Comparison</CardTitle>
                <CardDescription>Optimality and performance overview</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div>
                    <span className="font-medium">Greedy Scheduled:</span> {comparison.gScheduled}
                  </div>
                  <div>
                    <span className="font-medium">Backtracking Scheduled:</span> {comparison.bScheduled}
                  </div>
                </div>
                <div className="space-y-1">
                  <div>
                    <span className="font-medium">Greedy Time (ms):</span> {comparison.gMs.toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Backtracking Time (ms):</span> {comparison.bMs.toFixed(2)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div>
                    <span className="font-medium">Greedy Unscheduled:</span> {comparison.gUn}
                  </div>
                  <div>
                    <span className="font-medium">Backtracking Unscheduled:</span> {comparison.bUn}
                  </div>
                </div>
                <div className="space-y-1">
                  <div>
                    <span className="font-medium">Theoretical — Greedy:</span> {theoretical.greedy.time},{" "}
                    {theoretical.greedy.space}
                  </div>
                  <div>
                    <span className="font-medium">Theoretical — Backtracking:</span> {theoretical.backtracking.time},{" "}
                    {theoretical.backtracking.space}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Abstract & Problem Statement</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-pretty text-muted-foreground">
              Schedule a set of events into a fixed number of halls without overlaps per hall, maximizing the number of
              events placed. We compare a Greedy approach with a Backtracking approach, measuring runtime and allocation
              quality.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Algorithm Design</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-pretty text-muted-foreground space-y-2">
              <p>
                <span className="font-medium">Greedy:</span> Sort events by earliest finishing time, then assign each to
                the first hall where it doesn’t overlap.
              </p>
              <p>
                <span className="font-medium">Backtracking:</span> Recursively try to place each event into any hall;
                backtrack on conflicts; keep the best found within a time limit.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Input/Output Examples</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-pretty text-muted-foreground">
              Use the Inputs section to add or randomize events, set halls, and run both algorithms. The Results tab
              shows per-hall schedules and unscheduled events.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-pretty text-muted-foreground space-y-2">
              <p>
                <span className="font-medium">Theoretical:</span> Greedy O(n log n) time, O(n) space; Backtracking
                exponential time, O(n) space depth.
              </p>
              <p>
                <span className="font-medium">Observed:</span> See measured ms values and scheduled counts in the
                Results tab for your inputs.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Conclusion & Future Scope</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-pretty text-muted-foreground">
              Greedy is fast and near-optimal for typical inputs. Backtracking finds better solutions on tough instances
              but may need stronger pruning, heuristics, or ILP formulations for scale.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}
