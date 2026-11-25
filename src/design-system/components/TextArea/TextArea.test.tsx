// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, expect, it } from "vitest";
import { TextArea } from "./TextArea";

afterEach(cleanup);

it("accepts multiline input and exposes the disabled state", async () => {
  const { container } = render(
    <><TextArea label="Note" /><TextArea label="Unavailable" disabled /></>,
  );
  const note = screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Note" });
  const unavailable = screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Unavailable" });
  const user = userEvent.setup();
  await user.type(note, "First line{Enter}Second line");
  await user.type(unavailable, "Ignored");
  expect(note.value).toBe("First line\nSecond line");
  expect(unavailable.disabled).toBe(true);
  expect(unavailable.value).toBe("");
  expect((await axe.run(container, { runOnly: ["label"] })).violations).toEqual([]);
});
