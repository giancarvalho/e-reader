// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import type { Annotation } from "@/lib/sync/annotations";
import { CommentThread } from "./CommentThread";

vi.mock("@/features/annotations", () => ({ getNoteAuthor: vi.fn(async () => null) }));

beforeAll(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});
afterEach(cleanup);

const identity = { user: "me", group: "g", hash: "b" };
const annotation: Annotation = {
  id: "a", group_id: "g", book_id: "b", author_id: "other", cfi: "c", color: "amber",
  quote_text: "texto", note: null, name: "Ana Lima", avatar: null, deleted_at: null,
};

function open(row: Annotation) {
  render(<CommentThread identity={identity} annotation={row} rows={[]} save={async () => true} close={() => undefined} />);
}

it("says who highlighted a passage that has no note", () => {
  open(annotation);
  expect(screen.getByText("Grifado por")).toBeTruthy();
  expect(screen.getByText("Ana Lima")).toBeTruthy();
});

it("shows the author of a highlight with a note without the label", () => {
  open({ ...annotation, note: "Minha nota" });
  expect(screen.queryByText("Grifado por")).toBeNull();
  expect(screen.getByText("Ana Lima")).toBeTruthy();
});

it("always says Você for your own highlight, even when the server sent a name", () => {
  open({ ...annotation, author_id: "me", name: "Gian Carvalho" });
  expect(screen.getByText("Você")).toBeTruthy();
  expect(screen.queryByText("Gian Carvalho")).toBeNull();
});
