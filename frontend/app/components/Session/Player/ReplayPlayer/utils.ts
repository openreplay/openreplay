/**
 * Returns true if audible autoplay is possible right now.
 *   – If autoplay is blocked you get false (NotAllowedError).
 *   – If the browser can’t decode any test clip you get null.
 */
export async function canAutoplay() {
  const CLIPS = [
    {
      type: 'audio/wav',
      uri: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA',
    },
    {
      type: 'audio/mpeg',
      uri: 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Lj...',
    },
    {
      type: 'audio/ogg',
      uri: 'data:audio/ogg;base64,T2dnUwACAAAAAAAAAAAyzN3NAAAAAGFf2X8B...',
    },
  ];

  const el = document.createElement('audio');
  el.muted = false;

  for (const clip of CLIPS) {
    if (!el.canPlayType(clip.type)) continue;
    el.src = clip.uri;
    try {
      await el.play();
      el.remove();
      return true;
    } catch (err) {
      if (err.name === 'NotAllowedError') return false;
      if (err.name === 'NotSupportedError') continue;
      throw err;
    }
  }
  return null;
}
