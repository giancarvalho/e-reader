// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Heading } from "./Heading";

afterEach(cleanup);

it("renders the heading at the level requested by the caller", () => {
  render(<Heading as="h2">Capítulo</Heading>);
  expect(screen.getByRole("heading", { level: 2, name: "Capítulo" })).toBeTruthy();
});
