export const CameraResultType = { Base64: "base64" } as const;
export const CameraSource = { Camera: "camera" } as const;

export const Camera = {
  async getPhoto(): Promise<{ base64String: string }> {
    return { base64String: "" };
  },
};
