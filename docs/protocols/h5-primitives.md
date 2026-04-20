# Vekui H5 Primitive Contract

Vekui H5 primitives borrow Radix-style composition boundaries, but the interaction defaults stay H5-first instead of desktop-derived.

## Primitive Layers

- `pressable`
  Touch-first activation contract with hit slop, feedback mode, and scroll/press coordination.
- `overlay`
  Modal surface root with safe-area handling and dismissible-layer rules.
- `sheet`
  Bottom-oriented overlay with snap points, drag-to-dismiss, and keyboard avoidance.
- `picker`
  Sheet-backed selection surface with wheel visibility and confirmation behavior.

## H5-First Defaults

- Dismissal includes `system-back` and `swipe-down`, not only backdrop press.
- Safe-area handling defaults to bottom padding because mobile overlays often live near gesture areas.
- Keyboard avoidance is explicit and defaults to viewport-driven behavior.
- Motion defaults to `sheet-slide`, which matches mobile mental models better than generic dialog motion.

## Dependency Notes

The current package is contract-only. Future runtime work can map these contracts to:

- internal gesture and viewport utilities
- future focus-management helpers
- optional positioning or interaction libraries where needed

The contracts intentionally avoid hard-coding a dependency on desktop-first floating-position systems.
