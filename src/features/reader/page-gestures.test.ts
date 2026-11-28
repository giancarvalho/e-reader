import { describe, expect, it } from "vitest";
import { classifyPress, startsOnSystemEdge, tapZone } from "./page-gestures";

describe("classifyPress", () => {
  it("treats a quick still press as a tap", () => {
    expect(classifyPress(120, 2)).toBe("tap");
    expect(classifyPress(250, 0)).toBe("tap");
  });

  it("does nothing between a tap and a hold", () => {
    expect(classifyPress(251, 0)).toBe("dead");
    expect(classifyPress(499, 4)).toBe("dead");
  });

  it("selects after half a second without movement", () => {
    expect(classifyPress(500, 0)).toBe("hold");
    expect(classifyPress(1_800, 9)).toBe("hold");
  });

  it("treats movement as a drag at any duration", () => {
    expect(classifyPress(80, 11)).toBe("drag");
    expect(classifyPress(1_500, 40)).toBe("drag");
  });
});

describe("tapZone", () => {
  it("splits the page into 30% / 40% / 30%", () => {
    expect(tapZone(0)).toBe("prev");
    expect(tapZone(0.29)).toBe("prev");
    expect(tapZone(0.3)).toBe("toggle");
    expect(tapZone(0.5)).toBe("toggle");
    expect(tapZone(0.7)).toBe("toggle");
    expect(tapZone(0.71)).toBe("next");
    expect(tapZone(1)).toBe("next");
  });
});

describe("startsOnSystemEdge", () => {
  it("reserves 24 px on both edges", () => {
    expect(startsOnSystemEdge(5, 390)).toBe(true);
    expect(startsOnSystemEdge(24, 390)).toBe(false);
    expect(startsOnSystemEdge(366, 390)).toBe(false);
    expect(startsOnSystemEdge(380, 390)).toBe(true);
  });
});
