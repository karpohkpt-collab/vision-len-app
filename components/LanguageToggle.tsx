"use client";

export default function LanguageToggle({
  language,
  onChange,
}: {
  language: "en" | "zh";
  onChange: (language: "en" | "zh") => void;
}) {
  function select(next: "en" | "zh") {
    if (next === language) return;
    const label = next === "zh" ? "Chinese" : "English";
    if (window.confirm(`Switch to ${label}?`)) {
      onChange(next);
    }
  }

  return (
    <div className="flex rounded-lg border border-neutral-300 overflow-hidden text-sm">
      <button
        onClick={() => select("en")}
        aria-pressed={language === "en"}
        className={`flex-1 py-2 font-medium ${
          language === "en" ? "bg-blue-600 text-white" : "bg-white text-neutral-600"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => select("zh")}
        aria-pressed={language === "zh"}
        className={`flex-1 py-2 font-medium ${
          language === "zh" ? "bg-blue-600 text-white" : "bg-white text-neutral-600"
        }`}
      >
        中文
      </button>
    </div>
  );
}
