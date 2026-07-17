const lastSpokeAt: Map<string, number> = new Map();
const DEDUP_INTERVAL = 3000; // 3 seconds

export function speak(text: string): void {
  if (!window.speechSynthesis) {
    return;
  }

  const now = Date.now();
  const lastTime = lastSpokeAt.get(text) ?? 0;

  if (now - lastTime < DEDUP_INTERVAL) {
    return;
  }

  lastSpokeAt.set(text, now);

  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
}
