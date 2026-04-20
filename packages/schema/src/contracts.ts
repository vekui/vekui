export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type VekuiNamespace = "pc" | "h5" | "neutral" | "recipes";
export type VekuiPlatform = "pc" | "h5" | "shared";
export type RegistryItemType = "component" | "primitive" | "block" | "recipe";
export type TokenScope = "semantic" | "component" | "alias";
export type TokenKind =
  | "color"
  | "radius"
  | "size"
  | "space"
  | "shadow"
  | "opacity"
  | "typography"
  | "duration"
  | "easing"
  | "border"
  | "z-index";
export type TokenExportTarget = "css-vars" | "tailwind" | "pencil" | "figma" | "json";

export interface TokenEntry {
  name: string;
  path: string;
  kind: TokenKind;
  scope: TokenScope;
  platforms: Array<VekuiPlatform | "neutral">;
  exportTargets: TokenExportTarget[];
  value?: JsonValue;
  aliasOf?: string;
  component?: string;
  description?: string;
}

export interface TokenDocument {
  name: string;
  modes: string[];
  tokens: TokenEntry[];
}

export interface ManifestSlot {
  name: string;
  required: boolean;
  description?: string;
}

export interface ManifestVariant {
  name: string;
  type: "enum" | "boolean" | "string";
  values?: string[];
  default?: JsonValue;
}

export interface ManifestState {
  name: string;
  controllable: boolean;
  defaultValue: JsonValue;
}

export interface ManifestEvent {
  name: string;
  payload: Record<string, JsonValue>;
}

export interface ManifestTokenGroup {
  name: string;
  tokens: string[];
}

export interface ManifestA11y {
  role: string;
  attributes?: string[];
}

export interface ManifestConstraints {
  doNotUseWhen: string[];
}

export interface ManifestComposition {
  recommendedChildren: string[];
}

export interface ManifestExampleRef {
  name: string;
  description?: string;
}

export interface ComponentManifest {
  id: string;
  platform: VekuiPlatform;
  level: "core" | "composite" | "block";
  category: string;
  title: string;
  description: string;
  family: string;
  status: "draft" | "experimental" | "stable" | "deprecated";
  slots: ManifestSlot[];
  variants: ManifestVariant[];
  states: ManifestState[];
  events: ManifestEvent[];
  a11y: ManifestA11y;
  tokenContract: {
    groups: ManifestTokenGroup[];
  };
  constraints: ManifestConstraints;
  composition: ManifestComposition;
  designMappingRef: string;
  examples: ManifestExampleRef[];
}

export interface RecipeRegion {
  name: string;
  accepts: string[];
  required: boolean;
}

export interface RecipeDocument {
  id: string;
  platform: VekuiPlatform;
  intent: string;
  layout: string;
  requiredBlocks: string[];
  optionalBlocks: string[];
  regions: RecipeRegion[];
  layoutRules: string[];
  interactionRules: string[];
  recommendedTokens: string[];
  antiPatterns: string[];
}

export interface DesignTokenBinding {
  token: string;
  target: string;
  mode?: string;
}

export interface DesignVariantMapping {
  variant: string;
  value: string;
  target: string;
}

export interface DesignSlotMapping {
  slot: string;
  target: string;
}

export interface DesignStateMapping {
  state: string;
  target: string;
}

export interface DesignMapping {
  componentId: string;
  tool: "pencil" | "figma";
  tokenBindings: DesignTokenBinding[];
  variantMappings: DesignVariantMapping[];
  slotMappings: DesignSlotMapping[];
  stateMappings: DesignStateMapping[];
  assetRefs: string[];
  syncRules: string[];
}

export interface ThemePatchOp {
  action: "set" | "unset" | "alias";
  path: string;
  value?: JsonValue;
}

export interface ThemePatch {
  id: string;
  target: "global" | "component";
  platform: VekuiPlatform;
  scope: TokenScope;
  ops: ThemePatchOp[];
  reason: string;
  previewHints: {
    highlightComponents?: string[];
    suggestedRecipes?: string[];
  };
}

export interface RegistryInstallMeta {
  strategy: "copy" | "compose" | "generate";
  targets: string[];
  requiredDirectories: string[];
}

export interface RegistryAiHints {
  intentKeywords: string[];
  adaptationNotes: string[];
  preferredRecipes: string[];
}

export interface RegistryItem {
  id: string;
  name: string;
  namespace: VekuiNamespace;
  platform: VekuiPlatform;
  type: RegistryItemType;
  sourcePackage: string;
  sourceExport: string;
  sourceFiles: string[];
  manifestRef: string;
  manifestId: string;
  tokenRefs: string[];
  dependencyRefs: string[];
  peerDependencyHints: string[];
  install: RegistryInstallMeta;
  compatibility: Record<string, string>;
  registryTags: string[];
  aiHints: RegistryAiHints;
  hash: string;
}
