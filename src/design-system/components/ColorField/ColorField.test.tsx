// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, expect, it, vi } from "vitest";
import { ColorField } from "./ColorField";

afterEach(cleanup);

it("labels the color input and reports changes", () => {
  const onChange = vi.fn();
  render(<ColorField label="Cor de fundo" value="#ffffff" onChange={onChange} />);
  const input = screen.getByLabelText("Cor de fundo") as HTMLInputElement;
  expect(input.type).toBe("color");
  fireEvent.change(input, { target: { value: "#336699" } });
  expect(onChange).toHaveBeenCalledOnce();
});

it("can be disabled", () => {
  render(<ColorField label="Cor do texto" value="#000000" onChange={() => undefined} disabled />);
  expect((screen.getByLabelText("Cor do texto") as HTMLInputElement).disabled).toBe(true);
});

it("has an accessible name", async () => {
  const { container } = render(<ColorField label="Cor de fundo" value="#ffffff" onChange={() => undefined} />);
  expect((await axe.run(container, { runOnly: ["label"] })).violations).toEqual([]);
});
