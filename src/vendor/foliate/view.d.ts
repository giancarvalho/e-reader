import type { EPUB } from "./epub";

export class View extends HTMLElement {
  renderer: HTMLElement & {
    setStyles(css: string): void;
    getContents(): { doc: Document; index: number }[];
  };
  open(book: EPUB): Promise<void>;
  init(options: { lastLocation?: string; showTextStart?: boolean }): Promise<void>;
  prev(): Promise<void>;
  next(): Promise<void>;
  goTo(target: string): Promise<void>;
  getCFI(index: number, range: Range): string;
  addAnnotation(annotation: { id: string; value: string; color: string }): Promise<{ index: number; label: string }>;
  deleteAnnotation(annotation: { id: string; value: string; color: string }): Promise<unknown>;
  close(): void;
}
