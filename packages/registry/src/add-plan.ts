import { readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import {
  resolveWorkspaceRoot,
  type RecipeDocument,
  type RegistryItem
} from "../../schema/src/index.js";

export interface RecipeAddPlanCompositionEntry {
  region: string;
  children: string[];
}

export interface RecipeAddPlan {
  assembly: {
    installStrategy: RegistryItem["install"]["strategy"];
    installTarget: string;
    dependencyOrder: string[];
    regionSequence: string[];
    defaultComposition: RecipeAddPlanCompositionEntry[];
  };
  installation: {
    scaffoldFiles: string[];
    requiredRegistryItems: string[];
  };
}

export interface SourceExportSurface {
  filePath: string;
  found: boolean;
  inspectable: boolean;
  topLevelKeys: string[];
  objectLiteral?: ts.ObjectLiteralExpression;
  sourceFile?: ts.SourceFile;
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

export function unwrapExpression(expression: ts.Expression): ts.Expression {
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isTypeAssertionExpression(expression)
  ) {
    return unwrapExpression(expression.expression);
  }

  return expression;
}

export function findObjectPropertyExpression(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string
): ts.Expression | null {
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }

    const resolvedName = resolvePropertyName(property.name);

    if (resolvedName === propertyName) {
      return unwrapExpression(property.initializer);
    }
  }

  return null;
}

export function findObjectPropertyObjectLiteral(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string
): ts.ObjectLiteralExpression | null {
  const expression = findObjectPropertyExpression(objectLiteral, propertyName);

  return expression && ts.isObjectLiteralExpression(expression) ? expression : null;
}

export function readStringLiteralValue(expression: ts.Expression | null): string | null {
  if (!expression) {
    return null;
  }

  const unwrappedExpression = unwrapExpression(expression);

  return ts.isStringLiteral(unwrappedExpression) || ts.isNoSubstitutionTemplateLiteral(unwrappedExpression)
    ? unwrappedExpression.text
    : null;
}

export function readStringArrayValue(expression: ts.Expression | null): string[] | null {
  if (!expression) {
    return null;
  }

  const unwrappedExpression = unwrapExpression(expression);

  if (!ts.isArrayLiteralExpression(unwrappedExpression)) {
    return null;
  }

  const values: string[] = [];

  for (const element of unwrappedExpression.elements) {
    const value = readStringLiteralValue(element);

    if (value === null) {
      return null;
    }

    values.push(value);
  }

  return values;
}

export function readReferencePath(expression: ts.Expression | null): string | null {
  if (!expression) {
    return null;
  }

  const unwrappedExpression = unwrapExpression(expression);

  if (ts.isIdentifier(unwrappedExpression)) {
    return unwrappedExpression.text;
  }

  if (ts.isPropertyAccessExpression(unwrappedExpression)) {
    const left = readReferencePath(unwrappedExpression.expression);

    return left ? `${left}.${unwrappedExpression.name.text}` : null;
  }

  return null;
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

    if (ts.isFunctionDeclaration(statement) && statement.name && hasExportModifier(statement)) {
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
    topLevelKeys: collectObjectLiteralKeys(objectLiteral),
    objectLiteral,
    sourceFile
  };
}

export async function resolveSourceExportSurface(
  item: RegistryItem,
  rootDir = resolveWorkspaceRoot()
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

function readDefaultComposition(
  expression: ts.Expression | null
): RecipeAddPlanCompositionEntry[] | null {
  if (!expression) {
    return null;
  }

  const unwrappedExpression = unwrapExpression(expression);

  if (!ts.isArrayLiteralExpression(unwrappedExpression)) {
    return null;
  }

  const compositionEntries: RecipeAddPlanCompositionEntry[] = [];

  for (const element of unwrappedExpression.elements) {
    const entryExpression = unwrapExpression(element);

    if (!ts.isObjectLiteralExpression(entryExpression)) {
      return null;
    }

    const region = readStringLiteralValue(findObjectPropertyExpression(entryExpression, "region"));
    const children = readStringArrayValue(findObjectPropertyExpression(entryExpression, "children"));

    if (!region || !children) {
      return null;
    }

    compositionEntries.push({
      region,
      children
    });
  }

  return compositionEntries;
}

function readRegionSequence(
  expression: ts.Expression | null,
  manifestReference: string | null,
  manifest: RecipeDocument
): string[] | null {
  const directArray = readStringArrayValue(expression);

  if (directArray) {
    return directArray;
  }

  if (!expression || !manifestReference) {
    return null;
  }

  const unwrappedExpression = unwrapExpression(expression);

  if (!ts.isCallExpression(unwrappedExpression)) {
    return null;
  }

  if (!ts.isPropertyAccessExpression(unwrappedExpression.expression)) {
    return null;
  }

  if (unwrappedExpression.expression.name.text !== "map") {
    return null;
  }

  const targetReference = readReferencePath(unwrappedExpression.expression.expression);

  if (targetReference !== `${manifestReference}.regions`) {
    return null;
  }

  const [callback] = unwrappedExpression.arguments;

  if (!callback || !ts.isArrowFunction(callback) || callback.parameters.length !== 1) {
    return null;
  }

  const [parameter] = callback.parameters;

  if (!ts.isIdentifier(parameter.name)) {
    return null;
  }

  if (ts.isBlock(callback.body)) {
    return null;
  }

  const callbackBody = unwrapExpression(callback.body);

  if (!ts.isPropertyAccessExpression(callbackBody)) {
    return null;
  }

  if (!ts.isIdentifier(callbackBody.expression) || callbackBody.expression.text !== parameter.name.text) {
    return null;
  }

  if (callbackBody.name.text !== "name") {
    return null;
  }

  return manifest.regions.map((region) => region.name);
}

function readRequiredRegistryItems(
  expression: ts.Expression | null,
  manifestReference: string | null,
  manifest: RecipeDocument
): string[] | null {
  const directArray = readStringArrayValue(expression);

  if (directArray) {
    return directArray;
  }

  const referencePath = readReferencePath(expression);

  if (manifestReference && referencePath === `${manifestReference}.requiredBlocks`) {
    return [...manifest.requiredBlocks];
  }

  return null;
}

function validateRegionSequence(
  regionSequence: string[],
  manifest: RecipeDocument,
  item: RegistryItem,
  filePath: string
): void {
  const expectedRegionSequence = manifest.regions.map((region) => region.name);

  if (
    regionSequence.length !== expectedRegionSequence.length ||
    regionSequence.some((region, index) => region !== expectedRegionSequence[index])
  ) {
    throw new Error(
      `Recipe add-plan regionSequence in ${filePath} drifted from manifest.regions for ${item.id}. Expected ${expectedRegionSequence.join(", ")}.`
    );
  }
}

function validateDefaultComposition(
  defaultComposition: RecipeAddPlanCompositionEntry[],
  manifest: RecipeDocument,
  item: RegistryItem,
  filePath: string
): void {
  const manifestRegionsByName = new Map(manifest.regions.map((region) => [region.name, region]));
  const seenRegions = new Set<string>();

  for (const entry of defaultComposition) {
    const manifestRegion = manifestRegionsByName.get(entry.region);

    if (!manifestRegion) {
      throw new Error(
        `Recipe add-plan defaultComposition in ${filePath} references unknown region ${entry.region} for ${item.id}.`
      );
    }

    if (seenRegions.has(entry.region)) {
      throw new Error(
        `Recipe add-plan defaultComposition in ${filePath} contains duplicate region ${entry.region} for ${item.id}.`
      );
    }

    seenRegions.add(entry.region);

    for (const child of entry.children) {
      if (!manifestRegion.accepts.includes(child)) {
        throw new Error(
          `Recipe add-plan defaultComposition in ${filePath} references child ${child} that is not accepted by manifest region ${entry.region} for ${item.id}.`
        );
      }
    }
  }

  for (const region of manifest.regions) {
    if (region.required && !seenRegions.has(region.name)) {
      throw new Error(
        `Recipe add-plan defaultComposition in ${filePath} must include required manifest region ${region.name} for ${item.id}.`
      );
    }
  }
}

export async function extractRecipeAddPlan(
  item: RegistryItem,
  manifest: RecipeDocument,
  rootDir = resolveWorkspaceRoot()
): Promise<RecipeAddPlan> {
  const inspection = await resolveSourceExportSurface(item, rootDir);

  if (!inspection || !inspection.inspectable || !inspection.objectLiteral) {
    throw new Error(
      `Could not inspect recipe source export ${item.sourceExport} for ${item.id}.`
    );
  }

  const manifestReference = readReferencePath(findObjectPropertyExpression(inspection.objectLiteral, "manifest"));
  const assemblyObject = findObjectPropertyObjectLiteral(inspection.objectLiteral, "assembly");
  const installationObject = findObjectPropertyObjectLiteral(inspection.objectLiteral, "installation");

  if (!assemblyObject || !installationObject) {
    throw new Error(`Recipe source export ${item.sourceExport} must expose literal assembly and installation objects.`);
  }

  const installStrategy = readStringLiteralValue(findObjectPropertyExpression(assemblyObject, "installStrategy"));
  const installTarget = readStringLiteralValue(findObjectPropertyExpression(assemblyObject, "installTarget"));
  const dependencyOrder = readStringArrayValue(findObjectPropertyExpression(assemblyObject, "dependencyOrder"));
  const regionSequence = readRegionSequence(
    findObjectPropertyExpression(assemblyObject, "regionSequence"),
    manifestReference,
    manifest
  );
  const defaultComposition = readDefaultComposition(findObjectPropertyExpression(assemblyObject, "defaultComposition"));
  const scaffoldFiles = readStringArrayValue(findObjectPropertyExpression(installationObject, "scaffoldFiles"));
  const requiredRegistryItems = readRequiredRegistryItems(
    findObjectPropertyExpression(installationObject, "requiredRegistryItems"),
    manifestReference,
    manifest
  );

  if (!installStrategy || !installTarget || !dependencyOrder || !regionSequence || !defaultComposition || !scaffoldFiles || !requiredRegistryItems) {
    throw new Error(
      `Could not fully resolve actionable recipe add-plan fields from ${inspection.filePath} for ${item.id}.`
    );
  }

  if (installStrategy !== item.install.strategy) {
    throw new Error(
      `Recipe add-plan installStrategy ${installStrategy} drifted from registry install strategy ${item.install.strategy} for ${item.id}.`
    );
  }

  validateRegionSequence(regionSequence, manifest, item, inspection.filePath);
  validateDefaultComposition(defaultComposition, manifest, item, inspection.filePath);

  return {
    assembly: {
      installStrategy: item.install.strategy,
      installTarget,
      dependencyOrder,
      regionSequence,
      defaultComposition
    },
    installation: {
      scaffoldFiles,
      requiredRegistryItems
    }
  };
}
