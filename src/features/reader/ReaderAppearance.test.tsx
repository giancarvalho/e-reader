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

it("offers Dia, Pôr do Sol, Noite, Meia-Noite and Personalizado, with no Automático", () => {
  render(<Harness initial={defaultPreferences} />);
  const group = screen.getByText("Tema").closest("fieldset")!;
  const names = Array.from(group.querySelectorAll("button")).map(button => button.textContent);
  expect(names).toEqual(["Dia", "Pôr do Sol", "Noite", "Meia-Noite", "Personalizado"]);
});

it("marks the chosen theme and keeps Personalizado separate from Pôr do Sol", async () => {
  render(<Harness initial={defaultPreferences} />);
  expect(pressed("Dia")).toBe("true");

  await userEvent.click(screen.getByRole("button", { name: "Pôr do Sol" }));
  expect(pressed("Pôr do Sol")).toBe("true");
  expect(screen.queryByLabelText("Cor de fundo")).toBeNull();

  await userEvent.click(screen.getByRole("button", { name: "Personalizado" }));
  expect(pressed("Personalizado")).toBe("true");
  expect(pressed("Pôr do Sol")).toBe("false");
  expect(screen.getByLabelText("Cor de fundo")).toBeTruthy();
});
