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

export const h5PickerContract: H5PickerContract = {
  presentation: "sheet",
  columns: "single",
  primitive: createH5PickerRootContract({
    presentation: "sheet",
    visibleOptionCount: 5,
    confirmOnSelect: false,
    surface: createH5SheetRootContract({
      snapPoints: ["320px", "420px"],
      defaultSnapPoint: "420px",
      showDragHandle: false,
      keyboardAvoidance: "safe-area-offset"
    })
  })
};
