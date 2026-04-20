import assert from "node:assert/strict";
import test from "node:test";
import type { TokenDocument } from "../../schema/src/index.js";
import { compileTokenDocument } from "./index.js";

test("compileTokenDocument uses declared token modes for design tool exports", () => {
  const document: TokenDocument = {
    name: "vekui-brand",
    modes: ["brand"],
    tokens: [
      {
        name: "brand-primary",
        path: "semantic.color.brand.primary",
        kind: "color",
        scope: "semantic",
        platforms: ["shared"],
        value: "#112233",
        exportTargets: ["css-vars", "pencil", "figma", "json"]
      }
    ]
  };

  const compiled = compileTokenDocument(document);

  assert.deepStrictEqual(Object.keys(compiled.cssVars.byMode), ["brand"]);
  assert.deepStrictEqual(
    compiled.pencil.map((entry) => entry.mode),
    ["brand"]
  );
  assert.deepStrictEqual(
    compiled.figma.map((entry) => entry.mode),
    ["brand"]
  );
});
