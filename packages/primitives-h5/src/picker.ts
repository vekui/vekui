import { createH5SheetRootContract, type H5SheetRootContract } from "./sheet.js";

export interface H5PickerRootContract {
  presentation: "sheet" | "inline";
  wheelLoop: boolean;
  momentum: boolean;
  visibleOptionCount: 5 | 7;
  confirmOnSelect: boolean;
  surface: H5SheetRootContract | null;
}

export const defaultH5PickerRootContract: H5PickerRootContract = {
  presentation: "sheet",
  wheelLoop: false,
  momentum: true,
  visibleOptionCount: 5,
  confirmOnSelect: false,
  surface: createH5SheetRootContract({
    snapPoints: ["320px", "420px"],
    defaultSnapPoint: "420px"
  })
};

export function createH5PickerRootContract(
  overrides: Partial<H5PickerRootContract> = {}
): H5PickerRootContract {
  return {
    ...defaultH5PickerRootContract,
    ...overrides,
    surface: overrides.surface === null
      ? null
      : createH5SheetRootContract(
          overrides.surface ?? defaultH5PickerRootContract.surface ?? undefined
        )
  };
}

