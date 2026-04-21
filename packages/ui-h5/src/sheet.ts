import {
  defaultH5SheetRootContract,
  type H5SheetRootContract
} from "../../primitives-h5/src/index.js";

export interface H5SheetContract {
  size: "sm" | "md" | "lg";
  primitive: H5SheetRootContract;
}

export const h5SheetContract: H5SheetContract = {
  size: "md",
  primitive: defaultH5SheetRootContract
};
