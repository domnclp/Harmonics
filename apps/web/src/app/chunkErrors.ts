export const chunkReloadKey = "harmonics:chunk-reload-attempted";

export const isChunkLoadError = (error: unknown) =>
  error instanceof Error && /dynamically imported module|importing a module script failed|loading chunk/i.test(error.message);
