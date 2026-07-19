export function formatTime(seconds) {
  const safe = Math.max(Number(seconds) || 0, 0);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}m : ${String(rest).padStart(2, "0")}s`;
}

export function getErrorMessage(error) {
  return error?.response?.data?.error || error?.message || "Unable to load exam attempt.";
}

export function sameSelection(left = [], right = []) {
  if (left.length !== right.length) return false;

  const sortedLeft = [...left].map(Number).sort((a, b) => a - b);
  const sortedRight = [...right].map(Number).sort((a, b) => a - b);
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}
