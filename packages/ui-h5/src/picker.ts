import {
  createH5SheetRootContract,
  createH5PickerRootContract,
  type H5PickerRootContract
} from "../../primitives-h5/src/index.js";

export interface H5PickerContract {
  columns: "single" | "cascading";
  primitive: H5PickerRootContract;
}

const defaultH5PickerPrimitive: H5PickerRootContract = createH5PickerRootContract({
  presentation: "sheet",
  visibleOptionCount: 5,
  confirmOnSelect: false,
  surface: createH5SheetRootContract({
    snapPoints: ["320px", "420px"],
    defaultSnapPoint: "420px",
    showDragHandle: false,
    keyboardAvoidance: "safe-area-offset"
  })
});

export const h5PickerContract: H5PickerContract = {
  columns: "single",
  primitive: defaultH5PickerPrimitive
};
