export type TocEntry = { label: string; href: string; subitems?: TocEntry[] };

export class EPUB {
  constructor(loader: {
    loadText(name: string): string | null;
    loadBlob(name: string, type?: string): Blob | null;
    getSize(name: string): number;
  });
  init(): Promise<EPUB>;
  toc?: TocEntry[];
  destroy(): void;
}
