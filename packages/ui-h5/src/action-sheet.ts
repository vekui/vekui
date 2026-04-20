import {
  createH5OverlayRootContract,
  createH5SheetRootContract,
  type H5SheetRootContract
} from "../../primitives-h5/src/index.js";

export interface H5ActionSheetContract {
  size: "compact" | "comfortable";
  cancelActionPlacement: "separate-row" | "inline-tail";
  emphasizeDestructiveAction: boolean;
  primitive: H5SheetRootContract;
}

export const h5ActionSheetContract: H5ActionSheetContract = {
  size: "comfortable",
  cancelActionPlacement: "separate-row",
  emphasizeDestructiveAction: true,
  primitive: createH5SheetRootContract({
    snapPoints: ["content-height", "72%"],
    defaultSnapPoint: "content-height",
    keyboardAvoidance: "none",
    showDragHandle: false,
    overlay: createH5OverlayRootContract({
      motion: "platform-default"
    })
  })
};
