import type { EPUB } from "./epub";

export class View extends HTMLElement {
  renderer: { setStyles(css: string): void };
  open(book: EPUB): Promise<void>;
  init(options: { lastLocation?: string; showTextStart?: boolean }): Promise<void>;
  prev(): Promise<void>;
  next(): Promise<void>;
  goTo(target: string): Promise<void>;
  close(): void;
}
