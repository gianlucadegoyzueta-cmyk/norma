export const PushNotifications = {
  async requestPermissions(): Promise<{ receive: "granted" }> {
    return { receive: "granted" };
  },
  async register(): Promise<void> {
    return;
  },
  addListener(): void {
    return;
  },
};
