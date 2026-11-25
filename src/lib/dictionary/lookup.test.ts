import { expect, it } from "vitest";
import { detectDictionaryLanguage, dictionaryWord, findDefinitions, type DictionaryShard } from "./lookup";

it("chooses the book language before attempting fallback detection", () => {
  expect(detectDictionaryLanguage("EN-us", "não que com")).toBe("en");
  expect(detectDictionaryLanguage(null, "the boy was alone with the dog")).toBe("en");
  expect(detectDictionaryLanguage(null, "ele não saiu para a rua")).toBe("pt");
});

it("preserves accents and restricts dictionary lookup to one selected word", () => {
  expect(dictionaryWord("«Águas»")).toBe("águas");
  expect(dictionaryWord("pediu‑me")).toBe("pediu-me");
  expect(dictionaryWord("um trecho")).toBeNull();
});

it("follows multiple lemmas, avoids cycles and handles enclisis", async () => {
  const result = await findDefinitions("vindo-me", async (prefix): Promise<DictionaryShard> => prefix === "vi" ? {
    vindo: { definitions: [], lemmas: ["vir", "ver"] },
    vir: { definitions: [{ text: "Deslocar-se para cá.", pos: "verb" }], lemmas: ["vindo"] },
  } : {
    ver: { definitions: [{ text: "Perceber pela visão.", pos: "verb" }], lemmas: [] },
  });
  expect(result.map(entry => entry.word)).toEqual(["vir", "ver"]);
});

it("retains the offline error when a necessary shard is missing", async () => {
  await expect(findDefinitions("livro", async () => { throw new Error("offline"); })).rejects.toThrow("offline");
});
