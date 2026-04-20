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
    dependencyOrder: ["neutral.filter-bar"],
    regionSequence: pcListPageBasicRecipe.regions.map((region) => region.name),
    defaultComposition: [
      {
        region: "body",
        children: ["neutral.filter-bar"]
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
      "The main content region is a table, list, or empty state that can swap in place."
    ],
    extensionPoints: [
      "Insert app-specific result content after neutral.filter-bar once the project defines its own list or table block.",
      "Add app-owned summary or bulk-action sections around the body region only after the shared filter bar is in place."
    ]
  }
};
