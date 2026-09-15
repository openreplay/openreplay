function isMobile() {
  if (document.location.hostname.includes('localhost')) {
    return window.innerWidth < 1280; // For local development, assume mobile if width is less than 1280px
  }
  if (
    (navigator as any).userAgentData &&
    typeof (navigator as any).userAgentData.mobile === 'boolean'
  ) {
    return (navigator as any).userAgentData.mobile;
  }
  if (window.matchMedia?.('(pointer: coarse)').matches) {
    return true; // likely a touch-first device
  }

  return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(
    navigator.userAgent,
  );
}

export const mobileScreen = isMobile();
