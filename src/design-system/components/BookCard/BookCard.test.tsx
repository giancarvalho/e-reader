// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { BookCard } from "./BookCard";

afterEach(cleanup);

it("renders one accessible title with optional author, status and actions", () => {
  render(<BookCard title="Ficção" author="Ana" status="Disponível offline"><button>Ler</button></BookCard>);
  expect(screen.getByRole("heading", { level: 3, name: "Ficção" })).toBeTruthy();
  expect(screen.getByText("Ana")).toBeTruthy();
  expect(screen.getByText("Disponível offline")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ler" })).toBeTruthy();
});
