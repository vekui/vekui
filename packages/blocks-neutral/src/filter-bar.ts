export interface NeutralFilterBarSlotContract {
  name: "search-input" | "filter-groups" | "result-summary" | "primary-action" | "secondary-actions";
  required: boolean;
  sourceKey: "searchInput" | "filterGroups" | "resultSummary" | "primaryAction" | "secondaryActions";
  description: string;
  semantics: Record<string, boolean | number | string>;
}

export interface NeutralFilterBarStateContract {
  name: "busy" | "has-active-filters";
  controllable: boolean;
  defaultValue: boolean;
  meaning: string;
}

export interface NeutralFilterBarEventContract {
  name: "onQueryChange" | "onFiltersApply" | "onPrimaryAction";
  payload: Record<string, string>;
  trigger: string;
}

export interface NeutralFilterBarContract {
  density: "comfortable" | "compact";
  filterLayout: "inline" | "wrap";
  primaryActionPlacement: "trailing" | "separate-row";
  slots: NeutralFilterBarSlotContract[];
  states: NeutralFilterBarStateContract[];
  events: NeutralFilterBarEventContract[];
  a11y: {
    role: "search";
    attributes: ["aria-label"];
    labelTarget: "search-input";
  };
  tokenContract: {
    surface: ["component.neutral.filter-bar.background"];
  };
  constraints: {
    doNotUseWhen: string[];
    recommendedPlacement: "before-results-region";
  };
  composition: {
    recommendedChildren: [];
    order: Array<"search-input" | "filter-groups" | "result-summary" | "primary-action" | "secondary-actions">;
  };
  behavior: {
    applyMode: "manual";
    clearAllBehavior: "restore-defaults";
    preserveDraftFiltersBetweenRefreshes: boolean;
  };
}

export const neutralFilterBarContract: NeutralFilterBarContract = {
  density: "comfortable",
  filterLayout: "wrap",
  primaryActionPlacement: "trailing",
  slots: [
    {
      name: "search-input",
      required: false,
      sourceKey: "searchInput",
      description: "A compact search field for narrowing the current result set.",
      semantics: {
        mode: "debounced",
        debounceMs: 250,
        recommendedMaxLength: 80
      }
    },
    {
      name: "filter-groups",
      required: true,
      sourceKey: "filterGroups",
      description: "The canonical filter controls for status, owner, date, or other scoped facets.",
      semantics: {
        operatorMode: "single-or-multi",
        collapsedByDefault: false,
        maxVisibleGroups: 4
      }
    },
    {
      name: "result-summary",
      required: false,
      sourceKey: "resultSummary",
      description: "A lightweight summary of the active filter state or result count.",
      semantics: {
        placement: "inline-trailing",
        overflowBehavior: "truncate"
      }
    },
    {
      name: "primary-action",
      required: false,
      sourceKey: "primaryAction",
      description: "An optional action such as create, export, or save view.",
      semantics: {
        emphasis: "secondary",
        recommendedIntent: "create-or-export"
      }
    },
    {
      name: "secondary-actions",
      required: false,
      sourceKey: "secondaryActions",
      description: "Secondary actions like clear all, reset, or saved filters.",
      semantics: {
        placement: "trailing",
        allowClearAll: true
      }
    }
  ],
  states: [
    {
      name: "busy",
      controllable: true,
      defaultValue: false,
      meaning: "Indicates that the result set is refreshing or applying filters."
    },
    {
      name: "has-active-filters",
      controllable: true,
      defaultValue: false,
      meaning: "Signals whether clear-all and result summary affordances should surface active filters."
    }
  ],
  events: [
    {
      name: "onQueryChange",
      payload: {
        query: "string"
      },
      trigger: "Fire when the search input changes."
    },
    {
      name: "onFiltersApply",
      payload: {
        dirtyFilterCount: "number"
      },
      trigger: "Fire when the user explicitly applies draft filter changes."
    },
    {
      name: "onPrimaryAction",
      payload: {
        intent: "string"
      },
      trigger: "Fire when the optional primary action is invoked."
    }
  ],
  a11y: {
    role: "search",
    attributes: ["aria-label"],
    labelTarget: "search-input"
  },
  tokenContract: {
    surface: ["component.neutral.filter-bar.background"]
  },
  constraints: {
    doNotUseWhen: [
      "The page only needs a single standalone search field without scoped filters.",
      "The flow requires mobile-only sheet presentation or platform-specific navigation chrome."
    ],
    recommendedPlacement: "before-results-region"
  },
  composition: {
    recommendedChildren: [],
    order: ["search-input", "filter-groups", "result-summary", "primary-action", "secondary-actions"]
  },
  behavior: {
    applyMode: "manual",
    clearAllBehavior: "restore-defaults",
    preserveDraftFiltersBetweenRefreshes: true
  }
};
