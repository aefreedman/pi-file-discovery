export function coordinateCancellation(signal: AbortSignal) {
  if (signal.aborted) return "cleanup";
  return "lifecycle";
}
