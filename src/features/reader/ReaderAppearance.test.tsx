// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { defaultPreferences, type ReaderPreferences } from "@/lib/reader/model";
import { ReaderAppearance } from "./ReaderAppearance";

afterEach(cleanup);

function Harness({ initial }: { initial: ReaderPreferences }) {
  const [preferences, setPreferences] = useState(initial);
  return <ReaderAppearance preferences={preferences} change={setPreferences} />;
}

const pressed = (name: string) => screen.getByRole("button", { name }).getAttribute("aria-pressed");

it("selects Personalizado, with its color fields, after choosing Sépia", async () => {
  render(<Harness initial={defaultPreferences} />);
  await userEvent.click(screen.getByRole("button", { name: "Sépia" }));
  expect(pressed("Sépia")).toBe("true");

  await userEvent.click(screen.getByRole("button", { name: "Personalizado" }));
  expect(pressed("Personalizado")).toBe("true");
  expect(pressed("Sépia")).toBe("false");
  expect(screen.getByLabelText("Cor de fundo")).toBeTruthy();
});

it("goes back to Sépia when it is chosen again", async () => {
  render(<Harness initial={defaultPreferences} />);
  await userEvent.click(screen.getByRole("button", { name: "Personalizado" }));
  await userEvent.click(screen.getByRole("button", { name: "Sépia" }));
  expect(pressed("Sépia")).toBe("true");
  expect(pressed("Personalizado")).toBe("false");
});
