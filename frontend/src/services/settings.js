const LANGUAGE_KEY = "ridesync_language";
const AI_SETTINGS_KEY = "ridesync_ai_settings";

const defaultAiSettings = {
  aiMode: "cloud",
  localEndpoint: "http://localhost:11434",
  apiKey: "",
};

function obfuscate(value) {
  if (!value) return "";
  const bytes = new TextEncoder().encode(value);
  const xored = bytes.map((b) => b ^ 0xAA);
  return btoa(String.fromCharCode(...xored));
}

function deobfuscate(value) {
  if (!value) return "";
  const decoded = atob(value);
  const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
  const original = bytes.map((b) => b ^ 0xAA);
  return new TextDecoder().decode(original);
}

export function getStoredLanguage() {
  return localStorage.getItem(LANGUAGE_KEY) || "en";
}

export function setStoredLanguage(language) {
  localStorage.setItem(LANGUAGE_KEY, language);
}

export function getStoredAiSettings() {
  const raw = localStorage.getItem(AI_SETTINGS_KEY);
  if (!raw) {
    return { ...defaultAiSettings };
  }
  try {
    const stored = JSON.parse(raw);
    return {
      aiMode: stored.aiMode || defaultAiSettings.aiMode,
      localEndpoint: stored.localEndpoint || defaultAiSettings.localEndpoint,
      apiKey: stored.encryptedApiKey ? deobfuscate(stored.encryptedApiKey) : "",
    };
  } catch {
    return { ...defaultAiSettings };
  }
}

export function saveAiSettings(settings) {
  const saved = {
    aiMode: settings.aiMode || defaultAiSettings.aiMode,
    localEndpoint: settings.localEndpoint || defaultAiSettings.localEndpoint,
    encryptedApiKey: settings.apiKey ? obfuscate(settings.apiKey) : "",
  };
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(saved));
}

export function getAiHeaderOptions() {
  const { aiMode, localEndpoint, apiKey } = getStoredAiSettings();
  const headers = {
    "X-AI-Mode": aiMode,
    "X-AI-Local-Endpoint": localEndpoint,
  };
  if (apiKey) {
    headers["X-AI-BYOK-Key"] = apiKey;
  }
  return headers;
}

export function getAiSettingsForForm() {
  return getStoredAiSettings();
}
