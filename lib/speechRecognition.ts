// Thin wrapper around the (non-standard) Web Speech API SpeechRecognition.
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}

/** One-shot voice capture: listens once, resolves with the transcript. */
export function listenOnce(language: "en" | "zh"): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      reject(new Error("Speech recognition not supported"));
      return;
    }
    const recognition = new Ctor();
    recognition.lang = language === "zh" ? "zh-CN" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      resolve(transcript);
    };
    recognition.onerror = (event) => {
      reject(new Error(event.error ?? "speech recognition error"));
    };
    recognition.start();
  });
}

/** Continuous listener for a wake phrase. Calls onWake each time it's heard. */
export function startWakeWordListener(
  phrase: string,
  language: "en" | "zh",
  onWake: () => void,
): { stop: () => void } {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return { stop: () => {} };

  let stopped = false;
  let recognition: SpeechRecognitionLike | null = null;

  function start() {
    if (stopped) return;
    recognition = new Ctor!();
    recognition.lang = language === "zh" ? "zh-CN" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const results = event.results;
      for (let i = event.resultIndex; i < results.length; i++) {
        const transcript = (results[i][0].transcript as string)
          .toLowerCase()
          .trim();
        if (transcript.includes(phrase.toLowerCase())) {
          onWake();
        }
      }
    };
    recognition.onerror = () => {
      // Ignore transient errors (no-speech, network); restart below via onend.
    };
    recognition.onend = () => {
      if (!stopped) start();
    };
    recognition.start();
  }

  start();

  return {
    stop: () => {
      stopped = true;
      recognition?.stop();
    },
  };
}
