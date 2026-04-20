export interface NeutralFilterBarContract {
  density: "comfortable" | "compact";
  filterLayout: "inline" | "wrap";
  primaryActionPlacement: "trailing" | "separate-row";
  slots: {
    searchInput: {
      mode: "debounced";
      debounceMs: number;
      recommendedMaxLength: number;
    };
    filterGroups: {
      operatorMode: "single-or-multi";
      collapsedByDefault: boolean;
      maxVisibleGroups: number;
    };
    resultSummary: {
      placement: "inline-trailing";
      overflowBehavior: "truncate";
    };
    primaryAction: {
      emphasis: "secondary";
      recommendedIntent: "create-or-export";
    };
    secondaryActions: {
      placement: "trailing";
      allowClearAll: boolean;
    };
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
  slots: {
    searchInput: {
      mode: "debounced",
      debounceMs: 250,
      recommendedMaxLength: 80
    },
    filterGroups: {
      operatorMode: "single-or-multi",
      collapsedByDefault: false,
      maxVisibleGroups: 4
    },
    resultSummary: {
      placement: "inline-trailing",
      overflowBehavior: "truncate"
    },
    primaryAction: {
      emphasis: "secondary",
      recommendedIntent: "create-or-export"
    },
    secondaryActions: {
      placement: "trailing",
      allowClearAll: true
    }
  },
  behavior: {
    applyMode: "manual",
    clearAllBehavior: "restore-defaults",
    preserveDraftFiltersBetweenRefreshes: true
  }
};
