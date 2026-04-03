let _file: File | null = null;

export const pendingFileStore = {
  set: (f: File) => { _file = f; },
  get: () => _file,
  clear: () => { _file = null; },
};
