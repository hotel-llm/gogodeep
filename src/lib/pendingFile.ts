let _file: File | null = null;

export const pendingFileStore = {
  set: (f: File) => { _file = f; },
  get: () => _file,
  clear: () => { _file = null; },
};

// In-memory image store keyed by scanId — avoids history.state size limits
const _scanImages = new Map<string, string>();

export const scanImageStore = {
  set: (scanId: string, dataUrl: string) => { _scanImages.set(scanId, dataUrl); },
  get: (scanId: string): string | null => _scanImages.get(scanId) ?? null,
};
