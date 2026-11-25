import { expect, test } from "@playwright/test";

test("reopens a downloaded book listing from IndexedDB without a network", async ({ page, context, browserName }) => {
  test.skip(browserName === "webkit", "Installed iOS offline behavior is tested on a device.");
  await page.goto("/estante-offline");
  await page.getByText("Conecte-se para baixar livros neste aparelho.").waitFor();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.evaluate(async () => {
    const open = indexedDB.open("e-reader-library");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const group = "group";
    const user = "reader";
    const book = {
      id: "a".repeat(64), group_id: group, title: "Livro baixado", author: "Autora",
      language: "pt", cover_path: null, position: 0, is_current: true,
    };
    const transaction = db.transaction(["shelf", "files"], "readwrite");
    transaction.objectStore("shelf").put({ userId: user, books: [
      book, { ...book, id: "b".repeat(64), title: "Livro não baixado", is_current: false },
    ] }, "active");
    transaction.objectStore("files").put({
      userId: user, groupId: group, hash: book.id, file: new Blob(["fixture"]), cover: null,
    });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await context.setOffline(true);
  await page.goto("/estante");
  await expect(page.getByText("Estante offline")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Livro baixado" })).toBeVisible();
  await expect(page.getByText("Disponível offline")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Livro não baixado" })).toHaveCount(0);
});
