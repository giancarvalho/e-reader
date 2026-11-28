// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { defaultPreferences, type ReaderPreferences } from "@/lib/reader/model";
import { ReaderAppearance } from "./ReaderAppearance";

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(document, "fullscreenEnabled");
  Reflect.deleteProperty(document, "fullscreenElement");
});

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

it("hides the full screen option where the browser has none", () => {
  render(<Harness initial={defaultPreferences} />);
  expect(screen.queryByText("Tela cheia")).toBeNull();
});

it("turns the automatic full screen off and on, and remembers it", async () => {
  Object.defineProperty(document, "fullscreenEnabled", { value: true, configurable: true });
  Object.defineProperty(document, "fullscreenElement", { value: document.documentElement, configurable: true });
  const exit = vi.fn(async () => undefined);
  Object.defineProperty(document, "exitFullscreen", { value: exit, configurable: true });
  const enter = vi.fn(async () => undefined);
  document.documentElement.requestFullscreen = enter;
  render(<Harness initial={defaultPreferences} />);

  expect(pressed("Ligada")).toBe("true");
  await userEvent.click(screen.getByRole("button", { name: "Ligada" }));
  expect(localStorage.getItem("reader-fullscreen")).toBe("off");
  expect(exit).toHaveBeenCalled();
  expect(pressed("Desligada")).toBe("false");

  Object.defineProperty(document, "fullscreenElement", { value: null, configurable: true });
  await userEvent.click(screen.getByRole("button", { name: "Desligada" }));
  expect(localStorage.getItem("reader-fullscreen")).toBe("on");
  expect(enter).toHaveBeenCalled();
});
