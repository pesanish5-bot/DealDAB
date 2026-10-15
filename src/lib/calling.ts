export type VoiceMode = "browser-demo" | "vapi";

export type VoiceCapability = {
  activeMode: VoiceMode;
  browserDemoReady: true;
  realCallsConfigured: boolean;
  provider: "Vapi";
};

export function getVoiceCapability(): VoiceCapability {
  const realCallsConfigured = Boolean(
    process.env.VAPI_API_KEY?.trim() &&
    process.env.VAPI_PHONE_NUMBER_ID?.trim(),
  );

  return {
    activeMode: "browser-demo",
    browserDemoReady: true,
    realCallsConfigured,
    provider: "Vapi",
  };
}
