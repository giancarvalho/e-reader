// @vitest-environment jsdom
import { expect, it } from "vitest";
import { withMovedEdge } from "./selection-geometry";

function textRange(node: Node, start: number, end: number) {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  return range;
}

it("extends and contracts a selection across adjacent text nodes", () => {
  const paragraph = document.createElement("p");
  paragraph.innerHTML = "Um <em>livro</em> aberto";
  const middle = textRange(paragraph.children[0].firstChild!, 0, 5);
  const left = textRange(paragraph.firstChild!, 0, 2);
  const right = textRange(paragraph.lastChild!, 1, 7);

  const extended = withMovedEdge(withMovedEdge(middle, "start", left)!, "end", right)!;
  expect(extended.toString()).toBe("Um livro aberto");
  expect(withMovedEdge(extended, "start", middle)?.toString()).toBe("livro aberto");
  expect(middle.toString()).toBe("livro");
});

it("keeps at least one word when the handles would cross", () => {
  const text = document.createTextNode("Um livro aberto");
  const middle = textRange(text, 3, 8);
  expect(withMovedEdge(middle, "start", textRange(text, 9, 15))).toBeUndefined();
  expect(withMovedEdge(middle, "end", textRange(text, 0, 2))).toBeUndefined();
});
