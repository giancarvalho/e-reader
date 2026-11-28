// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { appVersion } from "@/lib/version";
import { AccountContent } from "./AccountPage";

afterEach(cleanup);

it("shows the app version on the account page", () => {
  render(<AccountContent name="Ana Lima" signOutFailed={false} />);
  expect(appVersion).toMatch(/^\d+\.\d+\.\d+$/);
  expect(screen.getByText(`Versão ${appVersion}`)).toBeTruthy();
});
