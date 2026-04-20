import {
  type H5DismissTrigger,
  type H5MotionPreset,
  type H5Placement,
  type H5SafeAreaContract,
  mergeContract
} from "./shared.js";

export interface H5DismissibleLayerContract {
  dismissTriggers: H5DismissTrigger[];
  trapFocus: boolean;
  restoreFocus: boolean;
  preventBackgroundScroll: boolean;
  inertBackground: boolean;
}

export interface H5OverlayRootContract {
  modal: boolean;
  placement: H5Placement;
  motion: H5MotionPreset;
  safeArea: H5SafeAreaContract;
  dismissibleLayer: H5DismissibleLayerContract;
}

export const defaultH5DismissibleLayerContract: H5DismissibleLayerContract = {
  dismissTriggers: ["backdrop-press", "system-back"],
  trapFocus: true,
  restoreFocus: true,
  preventBackgroundScroll: true,
  inertBackground: true
};

export const defaultH5OverlayRootContract: H5OverlayRootContract = {
  modal: true,
  placement: "bottom",
  motion: "sheet-slide",
  safeArea: {
    edges: ["bottom"],
    strategy: "padding",
    minimumInset: 12
  },
  dismissibleLayer: defaultH5DismissibleLayerContract
};

export function createH5DismissibleLayerContract(
  overrides: Partial<H5DismissibleLayerContract> = {}
): H5DismissibleLayerContract {
  return mergeContract(defaultH5DismissibleLayerContract, overrides);
}

export function createH5OverlayRootContract(
  overrides: Partial<H5OverlayRootContract> = {}
): H5OverlayRootContract {
  return {
    ...defaultH5OverlayRootContract,
    ...overrides,
    safeArea: {
      ...defaultH5OverlayRootContract.safeArea,
      ...overrides.safeArea
    },
    dismissibleLayer: {
      ...defaultH5OverlayRootContract.dismissibleLayer,
      ...overrides.dismissibleLayer
    }
  };
}

