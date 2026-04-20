import {
  createH5SheetRootContract,
  createH5PickerRootContract,
  type H5PickerRootContract
} from "../../primitives-h5/src/index.js";

export interface H5PickerContract {
  presentation: "sheet" | "inline";
  columns: "single" | "cascading";
  primitive: H5PickerRootContract;
}

const defaultH5PickerSurface = {
  presentation: "sheet",
  columns: "single"
} as const satisfies Pick<H5PickerContract, "presentation" | "columns">;

function createDerivedH5PickerPrimitive(
  contract: Pick<H5PickerContract, "presentation">
): H5PickerRootContract {
  return createH5PickerRootContract({
    presentation: contract.presentation,
    visibleOptionCount: 5,
    confirmOnSelect: false,
    surface:
      contract.presentation === "sheet"
        ? createH5SheetRootContract({
            snapPoints: ["320px", "420px"],
            defaultSnapPoint: "420px",
            showDragHandle: false,
            keyboardAvoidance: "safe-area-offset"
          })
        : null
  });
}

export const h5PickerContract: H5PickerContract = {
  presentation: defaultH5PickerSurface.presentation,
  columns: defaultH5PickerSurface.columns,
  primitive: createDerivedH5PickerPrimitive(defaultH5PickerSurface)
};
