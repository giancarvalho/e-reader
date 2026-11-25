// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, expect, it } from "vitest";
import { TextField } from "./TextField";

afterEach(cleanup);

it("associates the label, help and error with the input", async () => {
  const { container } = render(
    <>
      <p id="help">Use the code you received.</p>
      <TextField id="invite" label="Invite code" error="Invalid code" aria-describedby="help" />
    </>,
  );
  const field = screen.getByRole("textbox", { name: "Invite code" });
  expect(field.getAttribute("aria-invalid")).toBe("true");
  expect(field.getAttribute("aria-describedby")).toBe("help invite-error");
  expect(screen.getByText("Invalid code").id).toBe("invite-error");
  expect((await axe.run(container, { runOnly: ["label"] })).violations).toEqual([]);
});
