export type H5SafeAreaEdge = "top" | "right" | "bottom" | "left";
export type H5DismissTrigger = "backdrop-press" | "swipe-down" | "escape-key" | "system-back";
export type H5Placement = "bottom" | "top" | "center";
export type H5MotionPreset = "none" | "platform-default" | "sheet-slide" | "fade";

export interface H5SafeAreaContract {
  edges: H5SafeAreaEdge[];
  strategy: "padding" | "margin";
  minimumInset: number;
}

export function mergeContract<T extends object>(base: T, overrides: Partial<T> = {}): T {
  return {
    ...base,
    ...overrides
  };
}

