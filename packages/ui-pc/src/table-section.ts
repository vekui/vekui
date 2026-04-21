export interface PcTableSectionSlotContract {
  name: "toolbar" | "table" | "pagination" | "empty-state";
  required: boolean;
  sourceKey: "toolbar" | "table" | "pagination" | "emptyState";
  description: string;
  semantics: Record<string, boolean | number | string>;
}

export interface PcTableSectionStateContract {
  name: "busy" | "empty" | "has-selection";
  controllable: boolean;
  defaultValue: boolean;
  meaning: string;
}

export interface PcTableSectionEventContract {
  name: "onSelectionChange" | "onRowOpen";
  payload: Record<string, string>;
  trigger: string;
}

export interface PcTableSectionContract {
  density: "comfortable" | "compact";
  selection: "none" | "single" | "multiple";
  emptyState: "inline" | "dedicated";
  slots: PcTableSectionSlotContract[];
  states: PcTableSectionStateContract[];
  events: PcTableSectionEventContract[];
  a11y: {
    role: "region";
    attributes: ["aria-label", "aria-busy"];
    labelTarget: "toolbar-or-table";
  };
  tokenContract: {
    surface: ["component.pc.table-section.background"];
    divider: ["component.pc.table-section.divider"];
  };
  constraints: {
    doNotUseWhen: string[];
    recommendedPlacement: "below-filter-bar";
  };
  composition: {
    recommendedChildren: [];
    order: Array<"toolbar" | "table" | "pagination" | "empty-state">;
  };
}

export const pcTableSectionContract: PcTableSectionContract = {
  density: "comfortable",
  selection: "none",
  emptyState: "inline",
  slots: [
    {
      name: "toolbar",
      required: false,
      sourceKey: "toolbar",
      description: "Optional result controls for summary, batch actions, or view toggles above the table.",
      semantics: {
        placement: "above-table",
        stickyWithinSection: false
      }
    },
    {
      name: "table",
      required: true,
      sourceKey: "table",
      description: "The dense result surface that renders rows, columns, and row-level open actions.",
      semantics: {
        role: "result-region",
        rowOpenAction: "primary-row-action",
        supportsColumnDensitySwap: true
      }
    },
    {
      name: "pagination",
      required: false,
      sourceKey: "pagination",
      description: "Optional paging controls that stay attached to the current result set.",
      semantics: {
        placement: "footer-trailing",
        mode: "paged"
      }
    },
    {
      name: "empty-state",
      required: false,
      sourceKey: "emptyState",
      description: "Optional empty result affordance shown inside the section when no rows match.",
      semantics: {
        placement: "below-toolbar",
        intent: "results-empty"
      }
    }
  ],
  states: [
    {
      name: "busy",
      controllable: true,
      defaultValue: false,
      meaning: "Signals that the result region is loading or refreshing in place."
    },
    {
      name: "empty",
      controllable: true,
      defaultValue: false,
      meaning: "Signals that the current filters returned no rows for the section."
    },
    {
      name: "has-selection",
      controllable: true,
      defaultValue: false,
      meaning: "Signals that one or more rows are selected and selection-aware chrome can appear."
    }
  ],
  events: [
    {
      name: "onSelectionChange",
      payload: {
        selectionCount: "number",
        selectionMode: "none|single|multiple"
      },
      trigger: "Fire when the active row selection changes."
    },
    {
      name: "onRowOpen",
      payload: {
        rowKey: "string"
      },
      trigger: "Fire when the primary row-open action is invoked."
    }
  ],
  a11y: {
    role: "region",
    attributes: ["aria-label", "aria-busy"],
    labelTarget: "toolbar-or-table"
  },
  tokenContract: {
    surface: ["component.pc.table-section.background"],
    divider: ["component.pc.table-section.divider"]
  },
  constraints: {
    doNotUseWhen: [
      "The surface needs spreadsheet-grade editing, frozen columns, or grid authoring behavior.",
      "The flow is primarily card-based or requires a mobile-first stacked list instead of a dense PC result region."
    ],
    recommendedPlacement: "below-filter-bar"
  },
  composition: {
    recommendedChildren: [],
    order: ["toolbar", "table", "pagination", "empty-state"]
  }
};
