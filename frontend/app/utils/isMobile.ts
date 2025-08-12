function isMobile() {
  if (document.location.hostname.includes('localhost')) {
    return window.innerWidth < 1280; // For local development, assume mobile if width is less than 1280px
  }
  if (
    navigator.userAgentData &&
    typeof navigator.userAgentData.mobile === 'boolean'
  ) {
    return navigator.userAgentData.mobile;
  }
  if (window.matchMedia?.('(pointer: coarse)').matches) {
    return true; // likely a touch-first device
  }

  return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(
    navigator.userAgent,
  );
}

export const mobileScreen = isMobile();
