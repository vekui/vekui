import { mergeContract } from "./shared.js";

export interface H5PressableContract {
  disabled: boolean;
  preventScrollOnPress: boolean;
  touchFeedback: "opacity" | "scale" | "none";
  activationDelayMs: number;
  hitSlop: number;
}

export const defaultH5PressableContract: H5PressableContract = {
  disabled: false,
  preventScrollOnPress: false,
  touchFeedback: "opacity",
  activationDelayMs: 0,
  hitSlop: 8
};

export function createH5PressableContract(
  overrides: Partial<H5PressableContract> = {}
): H5PressableContract {
  return mergeContract(defaultH5PressableContract, overrides);
}

