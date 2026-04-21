import recipeFixture from "../fixtures/pc.list-page.basic.json" with { type: "json" };
import type { RecipeDocument } from "../../schema/src/index.js";

export interface RecipeAssemblyPlan {
  installStrategy: "compose";
  installTarget: "src/recipes";
  dependencyOrder: string[];
  regionSequence: string[];
  defaultComposition: Array<{
    region: string;
    children: string[];
  }>;
}

export interface RecipeSourceArtifact {
  manifest: RecipeDocument;
  assembly: RecipeAssemblyPlan;
  installation: {
    sourceLayout: "source-first";
    scaffoldFiles: string[];
    requiredRegistryItems: string[];
  };
  compositionNotes: {
    purpose: string;
    whenToStartFromThisRecipe: string[];
    extensionPoints: string[];
  };
}

export const pcListPageBasicRecipe = recipeFixture as RecipeDocument;

export const pcListPageBasicRecipeSource: RecipeSourceArtifact = {
  manifest: pcListPageBasicRecipe,
  assembly: {
    installStrategy: "compose",
    installTarget: "src/recipes",
    dependencyOrder: ["neutral.filter-bar", "pc.table-section"],
    regionSequence: pcListPageBasicRecipe.regions.map((region) => region.name),
    defaultComposition: [
      {
        region: "body",
        children: ["neutral.filter-bar", "pc.table-section"]
      }
    ]
  },
  installation: {
    sourceLayout: "source-first",
    scaffoldFiles: ["src/recipes/pc-list-page-basic.ts"],
    requiredRegistryItems: pcListPageBasicRecipe.requiredBlocks
  },
  compositionNotes: {
    purpose: "Shared starter for PC list pages that need filters before a dense result region.",
    whenToStartFromThisRecipe: [
      "The page needs search and scoped filters that stay visible above results.",
      "The main result surface should use pc.table-section as the default shared table and empty-state scaffold."
    ],
    extensionPoints: [
      "Layer app-specific columns, row actions, and data behavior inside pc.table-section instead of replacing the shared result-region asset.",
      "Add app-owned summary or bulk-action sections around the body region only after neutral.filter-bar and pc.table-section are in place."
    ]
  }
};
