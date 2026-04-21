import { createH5OverlayRootContract, type H5OverlayRootContract } from "./overlay.js";

export type H5SheetSnapPoint = "content-height" | `${number}%` | `${number}px`;

export interface H5SheetRootContract {
  overlay: H5OverlayRootContract;
  snapPoints: H5SheetSnapPoint[];
  defaultSnapPoint: H5SheetSnapPoint;
  dragToDismiss: boolean;
  keyboardAvoidance: "viewport-resize" | "safe-area-offset" | "none";
  showDragHandle: boolean;
}

export const defaultH5SheetRootContract: H5SheetRootContract = {
  overlay: createH5OverlayRootContract({
    placement: "bottom",
    dismissibleLayer: {
      dismissTriggers: ["backdrop-press", "swipe-down", "system-back"],
      trapFocus: true,
      restoreFocus: true,
      preventBackgroundScroll: true,
      inertBackground: true
    }
  }),
  snapPoints: ["content-height", "85%"],
  defaultSnapPoint: "content-height",
  dragToDismiss: true,
  keyboardAvoidance: "viewport-resize",
  showDragHandle: true
};

export function createH5SheetRootContract(
  overrides: Partial<H5SheetRootContract> = {}
): H5SheetRootContract {
  return {
    ...defaultH5SheetRootContract,
    ...overrides,
    overlay: createH5OverlayRootContract(overrides.overlay)
  };
}

