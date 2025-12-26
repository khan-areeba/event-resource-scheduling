export type EventItem = {
  id: string
  start: number
  end: number
}

export type ScheduledEvent = EventItem & { hallIndex: number }

export type HallSchedule = {
  hallIndex: number
  events: ScheduledEvent[]
}

export type AllocationCore = {
  scheduled: HallSchedule[]
  unscheduled: EventItem[]
  scheduledCount: number
}

export type AllocationResult = AllocationCore & {
  ms: number
  utilization?: { hallIndex: number; percent: number }[]
}

export function validateEvents(events: EventItem[], halls: number): { ok: boolean; message?: string } {
  if (!Array.isArray(events)) return { ok: false, message: "Events must be an array" }
  if (!Number.isFinite(halls) || halls < 1) return { ok: false, message: "Halls must be a positive integer" }
  for (const e of events) {
    if (!e.id || typeof e.id !== "string") return { ok: false, message: "Each event must have an ID" }
    if (!Number.isFinite(e.start) || !Number.isFinite(e.end))
      return { ok: false, message: `Event ${e.id} must have numeric start/end` }
    if (e.start < 0) return { ok: false, message: `Event ${e.id} has negative start` }
    if (e.end <= e.start) return { ok: false, message: `Event ${e.id} has end <= start` }
  }
  return { ok: true }
}

export function normalizeEvents(events: EventItem[]) {
  // clamp to integers and sort by start; remove empties
  const normalized = events
    .map((e) => ({ ...e, start: Math.floor(e.start), end: Math.floor(e.end) }))
    .filter((e) => e.id && e.end > e.start && e.start >= 0)
    .sort((a, b) => a.start - b.start || a.end - b.end)
  return { normalized }
}

function noOverlap(existing: EventItem[], candidate: EventItem): boolean {
  // Check overlap with all events in a hall
  for (const e of existing) {
    if (!(candidate.end <= e.start || candidate.start >= e.end)) return false
  }
  return true
}

export function scheduleGreedy(events: EventItem[], halls: number): AllocationCore {
  const sorted = [...events].sort((a, b) => a.end - b.end || a.start - b.start)
  const schedules: HallSchedule[] = Array.from({ length: halls }, (_, i) => ({ hallIndex: i, events: [] }))
  const unscheduled: EventItem[] = []

  for (const ev of sorted) {
    let placed = false
    for (const hall of schedules) {
      if (noOverlap(hall.events, ev)) {
        hall.events.push({ ...ev, hallIndex: hall.hallIndex })
        placed = true
        break
      }
    }
    if (!placed) {
      unscheduled.push(ev)
    }
  }

  return {
    scheduled: schedules.map((h) => ({ ...h, events: h.events.sort((a, b) => a.start - b.start) })),
    unscheduled,
    scheduledCount: schedules.reduce((acc, h) => acc + h.events.length, 0),
  }
}

export function scheduleGreedyTimed(events: EventItem[], halls: number): AllocationResult {
  const t0 = performance.now()
  const core = scheduleGreedy(events, halls)
  const t1 = performance.now()
  return { ...core, ms: t1 - t0 }
}

type BTState = {
  best: AllocationCore
  startTime: number
  limitMs: number
}

export function scheduleBacktrackingTimed(events: EventItem[], halls: number, limitMs = 500): AllocationResult {
  const t0 = performance.now()
  const core = scheduleBacktracking(events, halls, t0, limitMs)
  const t1 = performance.now()
  return { ...core, ms: t1 - t0 }
}

export function scheduleBacktracking(
  events: EventItem[],
  halls: number,
  startTime: number,
  limitMs: number,
): AllocationCore {
  // Sort by earlier finish then start (heuristic to improve pruning)
  const sorted = [...events].sort((a, b) => a.end - b.end || a.start - b.start)
  const schedules: HallSchedule[] = Array.from({ length: halls }, (_, i) => ({ hallIndex: i, events: [] }))
  const state: BTState = {
    best: {
      scheduled: schedules.map((h) => ({ hallIndex: h.hallIndex, events: [] })),
      unscheduled: sorted.slice(),
      scheduledCount: 0,
    },
    startTime,
    limitMs,
  }

  btDfs(0, sorted, schedules, [], state)

  // Prepare result: deep copy best
  const bestSchedules = state.best.scheduled.map((h) => ({
    hallIndex: h.hallIndex,
    events: [...h.events].sort((a, b) => a.start - b.start),
  }))
  const allScheduledIds = new Set(bestSchedules.flatMap((h) => h.events.map((e) => e.id)))
  const unscheduled = sorted.filter((e) => !allScheduledIds.has(e.id))

  return {
    scheduled: bestSchedules,
    unscheduled,
    scheduledCount: bestSchedules.reduce((acc, h) => acc + h.events.length, 0),
  }
}

function btDfs(idx: number, events: EventItem[], schedules: HallSchedule[], placed: ScheduledEvent[], state: BTState) {
  // Time limit cutoff
  if (performance.now() - state.startTime > state.limitMs) return

  const n = events.length
  if (idx >= n) {
    // Update best if we placed more
    if (placed.length > state.best.scheduledCount) {
      const snapshot = schedules.map((h) => ({ hallIndex: h.hallIndex, events: [...h.events] }))
      state.best = {
        scheduled: snapshot,
        unscheduled: [], // recomputed by caller
        scheduledCount: placed.length,
      }
    }
    return
  }

  const remaining = n - idx
  // Branch-and-bound: if even placing all remaining won't beat best, prune
  if (placed.length + remaining <= state.best.scheduledCount) return

  const ev = events[idx]

  // Try placing in any hall
  for (const hall of schedules) {
    if (noOverlap(hall.events, ev)) {
      hall.events.push({ ...ev, hallIndex: hall.hallIndex })
      placed.push({ ...ev, hallIndex: hall.hallIndex })

      btDfs(idx + 1, events, schedules, placed, state)

      placed.pop()
      hall.events.pop()

      // Optional fast heuristic: if placed in an empty hall and accepted, we can try next halls too
    }
  }

  // Option to skip this event (marks as unscheduled)
  btDfs(idx + 1, events, schedules, placed, state)
}

export function computeUtilization(result: AllocationCore, allEvents: EventItem[]) {
  if (!result.scheduled.length) return []
  const minStart = Math.min(...allEvents.map((e) => e.start))
  const maxEnd = Math.max(...allEvents.map((e) => e.end))
  const range = Math.max(1, maxEnd - minStart)
  return result.scheduled.map((h) => {
    const busy = h.events.reduce((acc, e) => acc + (e.end - e.start), 0)
    return { hallIndex: h.hallIndex, percent: Math.min(100, Math.max(0, (busy / range) * 100)) }
  })
}
