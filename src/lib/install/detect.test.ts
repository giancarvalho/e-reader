import { expect, it } from "vitest";
import { installKind } from "./detect";

const iphoneSafari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.1 Mobile/15E148 Safari/604.1";
const iphoneChrome = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1";
const iphoneInstagram = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0";
const iphoneWebView = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const ipadDesktopMode = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const androidChrome = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const androidWebView = "Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Mobile Safari/537.36";
const androidFirefox = "Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0";
const macDesktop = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

const kind = (userAgent: string, maxTouchPoints = 5, standalone = false) =>
  installKind({ userAgent, maxTouchPoints, standalone });

it("recognizes browsers where the app can be installed", () => {
  expect(kind(iphoneSafari)).toBe("ios");
  expect(kind(iphoneChrome)).toBe("ios");
  expect(kind(androidChrome)).toBe("android");
  expect(kind(androidFirefox)).toBe("android");
});

it("treats an iPad that asks for the desktop site as iOS, but not a Mac", () => {
  expect(kind(ipadDesktopMode, 5)).toBe("ios");
  expect(kind(macDesktop, 0)).toBe("none");
});

it("recognizes web views inside other apps", () => {
  expect(kind(iphoneInstagram)).toBe("embedded");
  expect(kind(iphoneWebView)).toBe("embedded");
  expect(kind(androidWebView)).toBe("embedded");
});

it("is silent when the app is already installed", () => {
  expect(kind(iphoneSafari, 5, true)).toBe("installed");
  expect(kind(androidChrome, 5, true)).toBe("installed");
});

it("ignores desktop browsers", () => {
  expect(kind("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36", 0)).toBe("none");
});
