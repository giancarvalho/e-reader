import type { Page } from "@playwright/test";
import { bytes as defaultBytes, hash as defaultHash } from "./epub";

// Seeds the offline library the same way the app stores it, so screens that
// need a downloaded book can be opened without a server session.
export async function seedLibrary(page: Page, options: { progress?: number; book?: { bytes: Uint8Array; hash: string } } = {}) {
  const { bytes, hash } = options.book ?? { bytes: defaultBytes, hash: defaultHash };
  await page.goto("/estante-offline");
  await page.getByText("Entre com sua conta quando estiver online para ver a estante deste aparelho.").waitFor();
  await page.evaluate(async ({ bytes, hash, progress }) => {
    const request = indexedDB.open("e-reader-library");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const user = "reader";
    const group = "group";
    const book = { id: hash, group_id: group, title: "Livro de teste", author: "Autora", language: "pt", cover_path: null, position: 0, is_current: true };
    const transaction = db.transaction(["shelf", "files", "lastOpened", "positions"], "readwrite");
    transaction.objectStore("shelf").put({ userId: user, books: [
      book, { ...book, id: "b".repeat(64), title: "Livro ainda não baixado", author: "Outra pessoa", is_current: false },
    ] }, "active");
    transaction.objectStore("files").put({ userId: user, groupId: group, hash, file: Uint8Array.from(bytes).buffer, cover: null });
    transaction.objectStore("lastOpened").put({ user, group, hash }, user);
    if (progress !== undefined) transaction.objectStore("positions").put({ cfi: "epubcfi(/6/2)", fraction: progress }, [user, group, hash]);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, { bytes: Array.from(bytes), hash, progress: options.progress });
  return hash;
}
