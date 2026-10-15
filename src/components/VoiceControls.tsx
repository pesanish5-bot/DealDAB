type Props = {
  muted: boolean;
  onMute: () => void;
  onSkip: () => void;
  speaking: boolean;
};

export function VoiceControls({ muted, onMute, onSkip, speaking }: Props) {
  return (
    <div className="voiceControls" aria-label="Voice controls">
      <button className="iconButton" type="button" onClick={onMute} aria-pressed={muted}>
        <span aria-hidden="true">{muted ? "🔇" : "◖))"}</span>
        {muted ? "Unmute" : "Mute"}
      </button>
      <button className="iconButton" type="button" onClick={onSkip} disabled={!speaking}>
        Skip voice <span aria-hidden="true">››</span>
      </button>
    </div>
  );
}
