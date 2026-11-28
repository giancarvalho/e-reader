import { createHash } from "node:crypto";
import { strToU8, unzipSync, zipSync } from "fflate";

const xhtml = (body: string) =>
  `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Leitura</title></head><body>${body}</body></html>`;

export const bytes = zipSync({
  mimetype: strToU8("application/epub+zip"),
  "META-INF/container.xml": strToU8(
    '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  ),
  "book.opf": strToU8(`<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book">example-reader</dc:identifier>
    <dc:title>Livro de teste</dc:title><dc:language>pt</dc:language></metadata>
    <manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="one" href="one.xhtml" media-type="application/xhtml+xml"/>
    <item id="two" href="two.xhtml" media-type="application/xhtml+xml"/></manifest>
    <spine><itemref idref="one"/><itemref idref="two"/></spine></package>`),
  "nav.xhtml": strToU8(xhtml('<nav xmlns:epub="http://www.idpf.org/2007/ops" epub:type="toc"><ol><li><a href="one.xhtml">Um</a></li><li><a href="two.xhtml">Dois</a></li></ol></nav>')),
  "one.xhtml": strToU8(xhtml('<p>Primeiro capítulo</p><script>parent.document.body.dataset.epubScript = "executed"</script><img src="https://example.invalid/tracker.png" alt="" onerror="parent.document.body.dataset.epubScript = &quot;handler&quot;"/>')),
  "two.xhtml": strToU8(xhtml("<p>Segundo capítulo</p>")),
});

export const hash = createHash("sha256").update(bytes).digest("hex");

// A single chapter with many lines, for gestures that need real text under the finger.
const longText = Array.from({ length: 40 }, (_, index) =>
  `<p>Capítulo ${index}: a casa ficava no alto da colina, e de lá se via o rio descer devagar entre os campos de milho até desaparecer na névoa da manhã.</p>`).join("");
export const longBook = (() => {
  const files = unzipSync(bytes);
  const opf = new TextDecoder().decode(files["book.opf"])
    .replace("example-reader", "long-reader")
    .replace('<item id="two" href="two.xhtml" media-type="application/xhtml+xml"/>', "")
    .replace('<itemref idref="two"/>', "");
  const long = zipSync({ ...files, "book.opf": strToU8(opf), "one.xhtml": strToU8(xhtml(longText)) });
  return { bytes: long, hash: createHash("sha256").update(long).digest("hex") };
})();
