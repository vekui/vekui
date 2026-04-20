import { access, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { assertTokenDocumentSemantics } from "../../tokens/src/index.js";
import {
  readJsonFile,
  resolveWorkspaceRoot,
  validateJsonFile,
  type ComponentManifest,
  type DesignMapping,
  type RecipeDocument,
  type RegistryItem,
  type TokenDocument,
  type VekuiNamespace
} from "../../schema/src/index.js";

export const registryFixturePath = "packages/registry/fixtures/index.json";

export interface RegistryIndex {
  version: number;
  items: string[];
}

export interface RegistryRefCheck {
  path: string;
  exists: boolean;
}

export interface RegistryVerificationResult {
  itemPath: string;
  item: RegistryItem;
  manifest: RegistryRefCheck;
  designMappings: RegistryRefCheck[];
  sourceFiles: RegistryRefCheck[];
  tokenRefs: RegistryRefCheck[];
  consistencyIssues: string[];
  valid: boolean;
}

export interface RegistrySummary {
  itemCount: number;
  namespaces: Record<string, number>;
  platforms: Record<string, number>;
  types: Record<string, number>;
}

function incrementCounter(counter: Record<string, number>, key: string): void {
  counter[key] = (counter[key] ?? 0) + 1;
}

function sortCounter(counter: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(counter).sort(([left], [right]) => left.localeCompare(right)));
}

async function checkRelativePath(rootDir: string, relativePath: string): Promise<RegistryRefCheck> {
  try {
    await access(path.join(rootDir, relativePath));
    return { path: relativePath, exists: true };
  } catch {
    return { path: relativePath, exists: false };
  }
}

function expectedInstallTarget(namespace: VekuiNamespace): string {
  switch (namespace) {
    case "pc":
      return "src/components/ui";
    case "h5":
      return "src/components/mobile";
    case "neutral":
      return "src/components/neutral";
    case "recipes":
      return "src/recipes";
  }
}

function expectedSourcePackage(namespace: VekuiNamespace): string | null {
  switch (namespace) {
    case "pc":
      return "@vekui/ui-pc";
    case "h5":
      return "@vekui/ui-h5";
    case "neutral":
      return "@vekui/blocks-neutral";
    case "recipes":
      return "@vekui/recipes";
  }
}

function collectNamespaceIssues(item: RegistryItem): string[] {
  const issues: string[] = [];

  if (item.namespace === "pc" && item.platform !== "pc") {
    issues.push("pc namespace items must target the pc platform.");
  }

  if (item.namespace === "h5" && item.platform !== "h5") {
    issues.push("h5 namespace items must target the h5 platform.");
  }

  if (item.namespace === "neutral" && item.platform !== "shared") {
    issues.push("neutral namespace items must target the shared platform.");
  }

  if (item.namespace === "recipes" && item.type !== "recipe") {
    issues.push("recipes namespace items must use the recipe type.");
  }

  return issues;
}

function collectInstallIssues(item: RegistryItem): string[] {
  const issues: string[] = [];
  const defaultTarget = expectedInstallTarget(item.namespace);

  if (!item.install.targets.includes(defaultTarget)) {
    issues.push(`install.targets must include ${defaultTarget}.`);
  }

  if (item.install.requiredDirectories.some((directory) => !item.install.targets.includes(directory))) {
    issues.push("install.requiredDirectories must be a subset of install.targets.");
  }

  return issues;
}

function collectSourcePackageIssues(item: RegistryItem): string[] {
  const issues: string[] = [];
  const expectedPackage = expectedSourcePackage(item.namespace);

  if (expectedPackage && item.sourcePackage !== expectedPackage) {
    issues.push(`sourcePackage must be ${expectedPackage} for ${item.namespace} items.`);
  }

  return issues;
}

function collectManifestConsistencyIssues(
  item: RegistryItem,
  manifest: ComponentManifest | RecipeDocument
): string[] {
  const issues: string[] = [];

  if (item.manifestId !== manifest.id) {
    issues.push(`manifestId ${item.manifestId} does not match manifest id ${manifest.id}.`);
  }

  if (item.namespace === "recipes") {
    if (!item.id.startsWith("recipes.")) {
      issues.push("recipe registry item ids must start with recipes.");
    }
  } else if (item.id !== manifest.id) {
    issues.push(`registry item id ${item.id} must match manifest id ${manifest.id}.`);
  }

  if (item.platform !== manifest.platform) {
    issues.push(`registry item platform ${item.platform} must match manifest platform ${manifest.platform}.`);
  }

  return issues;
}

function collectMappingConsistencyIssues(
  item: RegistryItem,
  manifest: ComponentManifest,
  mappings: DesignMapping[]
): string[] {
  const issues: string[] = [];

  for (const mapping of mappings) {
    if (mapping.componentId !== manifest.id) {
      issues.push(`design mapping ${mapping.tool} must point at ${manifest.id}, got ${mapping.componentId}.`);
    }
  }

  const tokenSet = new Set<string>();

  for (const mapping of mappings) {
    for (const binding of mapping.tokenBindings) {
      tokenSet.add(binding.token);
    }
  }

  if (item.type !== "recipe" && tokenSet.size === 0) {
    issues.push("component-like registry items should expose at least one design token binding.");
  }

  const variantMappings = mappings.flatMap((mapping) => mapping.variantMappings);
  const variantCoverage = new Map<string, Set<string>>();

  for (const mapping of variantMappings) {
    const values = variantCoverage.get(mapping.variant) ?? new Set<string>();
    values.add(mapping.value);
    variantCoverage.set(mapping.variant, values);
  }

  for (const variant of manifest.variants) {
    const expectedValues =
      variant.type === "enum"
        ? (variant.values ?? [])
        : variant.type === "boolean"
          ? ["true", "false"]
          : [];

    if (expectedValues.length === 0) {
      continue;
    }

    const mappedValues = variantCoverage.get(variant.name);

    if (!mappedValues) {
      issues.push(`design mappings must cover manifest variant ${variant.name}.`);
      continue;
    }

    for (const expectedValue of expectedValues) {
      if (!mappedValues.has(expectedValue)) {
        issues.push(`design mappings must cover variant ${variant.name} value ${expectedValue}.`);
      }
    }
  }

  return issues;
}

function collectRegistryReferenceIssues(item: RegistryItem, registryIds: Set<string>): string[] {
  const issues: string[] = [];

  for (const dependencyRef of item.dependencyRefs) {
    if (!registryIds.has(dependencyRef)) {
      issues.push(`dependencyRef ${dependencyRef} was not found in the registry catalog.`);
    }
  }

  for (const preferredRecipe of item.aiHints.preferredRecipes) {
    if (!registryIds.has(preferredRecipe)) {
      issues.push(`preferredRecipe ${preferredRecipe} was not found in the registry catalog.`);
    }
  }

  return issues;
}

function collectComponentCatalogIssues(manifest: ComponentManifest, surfaceIds: Set<string>): string[] {
  const issues: string[] = [];

  for (const childId of manifest.composition.recommendedChildren) {
    if (!surfaceIds.has(childId)) {
      issues.push(`component manifest recommended child ${childId} was not found in the surface catalog.`);
    }
  }

  return issues;
}

function collectRecipeCatalogIssues(manifest: RecipeDocument, surfaceIds: Set<string>): string[] {
  const issues: string[] = [];

  for (const requiredBlock of manifest.requiredBlocks) {
    if (!surfaceIds.has(requiredBlock)) {
      issues.push(`recipe requiredBlock ${requiredBlock} was not found in the surface catalog.`);
    }
  }

  for (const optionalBlock of manifest.optionalBlocks) {
    if (!surfaceIds.has(optionalBlock)) {
      issues.push(`recipe optionalBlock ${optionalBlock} was not found in the surface catalog.`);
    }
  }

  for (const region of manifest.regions) {
    for (const acceptedSurface of region.accepts) {
      if (!surfaceIds.has(acceptedSurface)) {
        issues.push(`recipe region ${region.name} accepts missing surface ${acceptedSurface}.`);
      }
    }
  }

  return issues;
}

interface SourceExportSurface {
  filePath: string;
  found: boolean;
  inspectable: boolean;
  topLevelKeys: string[];
}

function hasExportModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) {
    return false;
  }

  return ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function resolvePropertyName(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  return null;
}

function collectObjectLiteralKeys(initializer: ts.ObjectLiteralExpression): string[] {
  const keys: string[] = [];

  for (const property of initializer.properties) {
    if (
      ts.isPropertyAssignment(property) ||
      ts.isShorthandPropertyAssignment(property) ||
      ts.isMethodDeclaration(property) ||
      ts.isGetAccessorDeclaration(property) ||
      ts.isSetAccessorDeclaration(property)
    ) {
      const key = resolvePropertyName(property.name);

      if (key) {
        keys.push(key);
      }
    }
  }

  return keys;
}

function inspectSourceExportSurface(sourceText: string, filePath: string, exportName: string): SourceExportSurface {
  const scriptKind = filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind);
  const localObjectExports = new Map<string, ts.ObjectLiteralExpression | null>();
  const exportedBindings = new Map<string, string>();

  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) {
          continue;
        }

        const localName = declaration.name.text;
        localObjectExports.set(
          localName,
          declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)
            ? declaration.initializer
            : null
        );

        if (hasExportModifier(statement)) {
          exportedBindings.set(localName, localName);
        }
      }
    }

    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name &&
      hasExportModifier(statement)
    ) {
      exportedBindings.set(statement.name.text, statement.name.text);
    }

    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause) &&
      !statement.moduleSpecifier
    ) {
      for (const element of statement.exportClause.elements) {
        const exportedName = element.name.text;
        const localName = (element.propertyName ?? element.name).text;
        exportedBindings.set(exportedName, localName);
      }
    }
  }

  const localName = exportedBindings.get(exportName);

  if (!localName) {
    return {
      filePath,
      found: false,
      inspectable: false,
      topLevelKeys: []
    };
  }

  const objectLiteral = localObjectExports.get(localName);

  if (!objectLiteral) {
    return {
      filePath,
      found: true,
      inspectable: false,
      topLevelKeys: []
    };
  }

  return {
    filePath,
    found: true,
    inspectable: true,
    topLevelKeys: collectObjectLiteralKeys(objectLiteral)
  };
}

async function resolveSourceExportSurface(
  item: RegistryItem,
  rootDir: string
): Promise<SourceExportSurface | null> {
  for (const relativePath of item.sourceFiles) {
    const absolutePath = path.join(rootDir, relativePath);

    let sourceText: string;

    try {
      sourceText = await readFile(absolutePath, "utf8");
    } catch {
      continue;
    }

    const inspection = inspectSourceExportSurface(sourceText, relativePath, item.sourceExport);

    if (inspection.found) {
      return inspection;
    }
  }

  return null;
}

function toCamelCase(value: string): string {
  return value.replace(/-([a-z0-9])/g, (_, character: string) => character.toUpperCase());
}

async function collectSourceExportIssues(
  item: RegistryItem,
  manifest: ComponentManifest,
  rootDir: string
): Promise<string[]> {
  const inspection = await resolveSourceExportSurface(item, rootDir);

  if (!inspection) {
    return [`sourceExport ${item.sourceExport} was not found in the declared sourceFiles.`];
  }

  if (!inspection.inspectable) {
    return [
      `sourceExport ${item.sourceExport} in ${inspection.filePath} must resolve to an exported object literal contract.`
    ];
  }

  const issues: string[] = [];
  const topLevelKeys = new Set(inspection.topLevelKeys);

  for (const variant of manifest.variants) {
    const expectedKey = toCamelCase(variant.name);

    if (!topLevelKeys.has(expectedKey)) {
      issues.push(
        `sourceExport ${item.sourceExport} in ${inspection.filePath} must expose top-level key ${expectedKey} for manifest variant ${variant.name}.`
      );
    }
  }

  return issues;
}

function buildTokenPathSet(documents: TokenDocument[]): Set<string> {
  const tokenPaths = new Set<string>();

  for (const document of documents) {
    for (const token of document.tokens) {
      tokenPaths.add(token.path);
    }
  }

  return tokenPaths;
}

function collectTokenCoverageIssues(
  manifest: ComponentManifest,
  mappings: DesignMapping[],
  tokenPaths: Set<string>
): string[] {
  const issues: string[] = [];

  for (const group of manifest.tokenContract.groups) {
    for (const token of group.tokens) {
      if (!tokenPaths.has(token)) {
        issues.push(`manifest tokenContract references missing token ${token}.`);
      }
    }
  }

  for (const mapping of mappings) {
    for (const binding of mapping.tokenBindings) {
      if (!tokenPaths.has(binding.token)) {
        issues.push(`design mapping ${mapping.tool} references missing token ${binding.token}.`);
      }
    }
  }

  return issues;
}

function formatInvalidResult(result: RegistryVerificationResult): string {
  const missingRefs = [
    result.manifest,
    ...result.sourceFiles,
    ...result.tokenRefs,
    ...result.designMappings
  ].filter((reference) => !reference.exists);

  const missingLines = missingRefs.map((reference) => `- ${reference.path}`).join("\n");
  const issueLines = result.consistencyIssues.map((issue) => `- ${issue}`).join("\n");

  const sections = [`${result.item.platform}/${result.item.name} failed registry validation`];

  if (missingLines) {
    sections.push(`Missing references:\n${missingLines}`);
  }

  if (issueLines) {
    sections.push(`Consistency issues:\n${issueLines}`);
  }

  return sections.join("\n\n");
}

export function resolveRegistryIndexPath(rootDir = resolveWorkspaceRoot()): string {
  return path.join(rootDir, registryFixturePath);
}

export async function loadRegistryIndex(rootDir = resolveWorkspaceRoot()): Promise<RegistryIndex> {
  return readJsonFile<RegistryIndex>(resolveRegistryIndexPath(rootDir));
}

export async function loadRegistryItems(rootDir = resolveWorkspaceRoot()): Promise<RegistryVerificationResult[]> {
  const index = await loadRegistryIndex(rootDir);

  return Promise.all(
    index.items.map(async (relativeItemPath) => {
      const absoluteItemPath = path.join(rootDir, relativeItemPath);
      await validateJsonFile("registry-item", absoluteItemPath, rootDir);
      const item = await readJsonFile<RegistryItem>(absoluteItemPath);
      const manifest = await checkRelativePath(rootDir, item.manifestRef);
      const designMappings: RegistryRefCheck[] = [];
      const sourceFiles = await Promise.all(item.sourceFiles.map((sourceFile) => checkRelativePath(rootDir, sourceFile)));
      const tokenRefs = await Promise.all(item.tokenRefs.map((tokenRef) => checkRelativePath(rootDir, tokenRef)));
      const tokenDocuments: TokenDocument[] = [];
      const consistencyIssues = [
        ...collectNamespaceIssues(item),
        ...collectInstallIssues(item),
        ...collectSourcePackageIssues(item)
      ];

      for (const tokenRef of tokenRefs) {
        if (tokenRef.exists) {
          const tokenPath = path.join(rootDir, tokenRef.path);
          await validateJsonFile("token", tokenPath, rootDir);
          const tokenDocument = await readJsonFile<TokenDocument>(tokenPath);
          assertTokenDocumentSemantics(tokenDocument);
          tokenDocuments.push(tokenDocument);
        }
      }

      if (manifest.exists) {
        const manifestPath = path.join(rootDir, item.manifestRef);
        const manifestKind = item.type === "recipe" ? "recipe" : "component-manifest";
        await validateJsonFile(manifestKind, manifestPath, rootDir);

        if (manifestKind === "recipe") {
          const manifestDocument = await readJsonFile<RecipeDocument>(manifestPath);
          consistencyIssues.push(...collectManifestConsistencyIssues(item, manifestDocument));
        } else {
          const manifestDocument = await readJsonFile<ComponentManifest>(manifestPath);
          consistencyIssues.push(
            ...collectManifestConsistencyIssues(item, manifestDocument),
            ...(await collectSourceExportIssues(item, manifestDocument, rootDir))
          );

          const mappingRef = await checkRelativePath(rootDir, manifestDocument.designMappingRef);
          designMappings.push(mappingRef);
          const mappingDocuments: DesignMapping[] = [];

          if (mappingRef.exists) {
            const mappingPath = path.join(rootDir, mappingRef.path);
            await validateJsonFile("design-mapping", mappingPath, rootDir);
            const mappingDocument = await readJsonFile<DesignMapping>(mappingPath);
            mappingDocuments.push(mappingDocument);
            consistencyIssues.push(
              ...collectMappingConsistencyIssues(item, manifestDocument, mappingDocuments),
              ...collectTokenCoverageIssues(
                manifestDocument,
                mappingDocuments,
                buildTokenPathSet(tokenDocuments)
              )
            );
          }
        }
      }

      const valid =
        manifest.exists &&
        designMappings.every((reference) => reference.exists) &&
        sourceFiles.every((reference) => reference.exists) &&
        tokenRefs.every((reference) => reference.exists) &&
        consistencyIssues.length === 0;

      return {
        itemPath: relativeItemPath,
        item,
        manifest,
        designMappings,
        sourceFiles,
        tokenRefs,
        consistencyIssues,
        valid
      };
    })
  );
}

export async function assertRegistryIntegrity(rootDir = resolveWorkspaceRoot()): Promise<RegistryVerificationResult[]> {
  const results = await loadRegistryItems(rootDir);
  const registryIds = new Set(results.map((result) => result.item.id));
  const surfaceIds = new Set(
    results
      .filter((result) => result.item.type !== "recipe")
      .map((result) => result.item.id)
  );

  for (const result of results) {
    result.consistencyIssues.push(...collectRegistryReferenceIssues(result.item, registryIds));

    if (result.manifest.exists) {
      const manifestPath = path.join(rootDir, result.item.manifestRef);

      if (result.item.type === "recipe") {
        const manifestDocument = await readJsonFile<RecipeDocument>(manifestPath);
        result.consistencyIssues.push(...collectRecipeCatalogIssues(manifestDocument, surfaceIds));
      } else {
        const manifestDocument = await readJsonFile<ComponentManifest>(manifestPath);
        result.consistencyIssues.push(...collectComponentCatalogIssues(manifestDocument, surfaceIds));
      }
    }

    result.valid =
      result.manifest.exists &&
      result.designMappings.every((reference) => reference.exists) &&
      result.sourceFiles.every((reference) => reference.exists) &&
      result.tokenRefs.every((reference) => reference.exists) &&
      result.consistencyIssues.length === 0;
  }

  const invalidResults = results.filter((result) => !result.valid);

  if (invalidResults.length > 0) {
    throw new Error(invalidResults.map((result) => formatInvalidResult(result)).join("\n\n"));
  }

  return results;
}

export async function resolveRegistryItem(
  registryId: string,
  rootDir = resolveWorkspaceRoot()
): Promise<RegistryVerificationResult> {
  const results = await assertRegistryIntegrity(rootDir);
  const match = results.find((result) => result.item.id === registryId);

  if (!match) {
    throw new Error(`Unknown registry item: ${registryId}`);
  }

  return match;
}

export function summarizeRegistry(results: RegistryVerificationResult[]): RegistrySummary {
  const namespaces: Record<string, number> = {};
  const platforms: Record<string, number> = {};
  const types: Record<string, number> = {};

  for (const result of results) {
    incrementCounter(namespaces, result.item.namespace);
    incrementCounter(platforms, result.item.platform);
    incrementCounter(types, result.item.type);
  }

  return {
    itemCount: results.length,
    namespaces: sortCounter(namespaces),
    platforms: sortCounter(platforms),
    types: sortCounter(types)
  };
}
