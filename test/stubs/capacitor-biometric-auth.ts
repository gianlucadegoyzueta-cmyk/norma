export const BiometricAuth = {
  async checkBiometry(): Promise<{ isAvailable: boolean }> {
    return { isAvailable: false };
  },
  async authenticate(): Promise<void> {
    return;
  },
};
