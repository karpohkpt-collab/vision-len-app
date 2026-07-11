export function speak(text: string, language: "en" | "zh", rate = 1) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === "zh" ? "zh-CN" : "en-US";
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

/** Speaks each text in order (e.g. hazard alert first, then full description). */
export function speakQueue(texts: string[], language: "en" | "zh", rate = 1) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  for (const text of texts) {
    if (!text) continue;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "zh" ? "zh-CN" : "en-US";
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  }
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}
