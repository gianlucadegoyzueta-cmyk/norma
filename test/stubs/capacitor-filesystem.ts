export const Directory = { Cache: "CACHE" } as const;

export const Filesystem = {
  async writeFile(opts: { path: string }): Promise<{ uri: string }> {
    return { uri: `file://${opts.path}` };
  },
};
