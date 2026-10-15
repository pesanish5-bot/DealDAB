import type { SpokenLanguage } from "@/lib/speech";

type VoiceChoice = { name: string; lang: string; voiceURI: string };

type Props = {
  voices: VoiceChoice[];
  language: SpokenLanguage;
  agentVoiceUri: string;
  businessVoiceUri: string;
  rate: number;
  onLanguage: (language: SpokenLanguage) => void;
  onAgentVoice: (voiceUri: string) => void;
  onBusinessVoice: (voiceUri: string) => void;
  onRate: (rate: number) => void;
  onPreview: (speaker: "agent" | "business") => void;
};

export function VoiceStudio({ voices, language, agentVoiceUri, businessVoiceUri, rate, onLanguage, onAgentVoice, onBusinessVoice, onRate, onPreview }: Props) {
  const languageVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith(language.slice(0, 2).toLowerCase()));
  const choices = languageVoices.length ? languageVoices : voices;
  const hasNativeLanguageVoice = languageVoices.length > 0;

  return (
    <section className="voiceStudio" aria-labelledby="voice-studio-title">
      <div className="studioHead">
        <div><span className="studioIcon" aria-hidden="true">◖))</span><div><b id="voice-studio-title">Voice studio</b><small>Choose how each side sounds</small></div></div>
        <span className={`voiceAvailability ${hasNativeLanguageVoice ? "ready" : "fallback"}`}>{hasNativeLanguageVoice ? `${languageVoices.length} native voices` : "browser fallback"}</span>
      </div>
      <div className="studioGrid">
        <label>Spoken language<select value={language} onChange={(event) => onLanguage(event.target.value as SpokenLanguage)}><option value="en-IN">English · India</option><option value="hi-IN">हिन्दी · भारत</option></select></label>
        <label>DealDAB voice<select value={agentVoiceUri} onChange={(event) => onAgentVoice(event.target.value)}><option value="">Automatic</option>{choices.map((voice) => <option key={`agent-${voice.voiceURI}`} value={voice.voiceURI}>{voice.name} · {voice.lang}</option>)}</select></label>
        <label>Vendor voice<select value={businessVoiceUri} onChange={(event) => onBusinessVoice(event.target.value)}><option value="">Automatic</option>{choices.map((voice) => <option key={`vendor-${voice.voiceURI}`} value={voice.voiceURI}>{voice.name} · {voice.lang}</option>)}</select></label>
      </div>
      <div className="studioFooter">
        <label>Speed <input aria-label="Voice speed" type="range" min="0.8" max="1.25" step="0.05" value={rate} onChange={(event) => onRate(Number(event.target.value))} /><b>{rate.toFixed(2)}×</b></label>
        <div><button type="button" onClick={() => onPreview("agent")}>Preview DealDAB</button><button type="button" onClick={() => onPreview("business")}>Preview vendor</button></div>
      </div>
      {language === "hi-IN" && !hasNativeLanguageVoice && <p className="voiceFallbackNote">Hindi speech text is ready, but this browser has no Hindi voice installed. It will use the browser default voice.</p>}
    </section>
  );
}
