export {};

declare global {
  interface Window {
    __or_revokeSpotPatch?: (() => void) | null;
    __or_proxy_revocable?: { revoke: () => void }[];
    __or_clear_notifications?: (() => void) | null;
    revokeSpotPatch?: () => void;
  }
}
