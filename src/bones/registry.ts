export function registerBoneyardRegistry(): void {
  // Loads generated bone modules when present; remains a no-op in local/dev setups without captures.
  void import.meta.glob('./**/*.bone.{ts,tsx,js,jsx}', { eager: true });
}
