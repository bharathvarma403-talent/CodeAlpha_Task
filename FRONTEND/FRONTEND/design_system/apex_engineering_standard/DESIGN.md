---
name: Apex Engineering Standard
colors:
  surface: '#15121b'
  surface-dim: '#15121b'
  surface-bright: '#3b3742'
  surface-container-lowest: '#0f0d15'
  surface-container-low: '#1d1a23'
  surface-container: '#211e27'
  surface-container-high: '#2c2832'
  surface-container-highest: '#37333d'
  on-surface: '#e7e0ed'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e7e0ed'
  inverse-on-surface: '#322f39'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c0'
  on-secondary-container: '#b0b2ff'
  tertiary: '#ffb869'
  on-tertiary: '#482900'
  tertiary-container: '#ca801e'
  on-tertiary-container: '#3f2300'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#ffdcbb'
  tertiary-fixed-dim: '#ffb869'
  on-tertiary-fixed: '#2c1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#15121b'
  on-background: '#e7e0ed'
  surface-variant: '#37333d'
typography:
  h1:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono:
    fontFamily: ui-monospace, SFMono-Regular
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 24px
  gutter: 16px
  list-item-gap: 4px
  card-gap: 12px
---

## Brand & Style

The design system is engineered for high-velocity teams who demand a tool that moves as fast as they think. The aesthetic is **Minimalist-Corporate**, blending the systematic precision of a code editor with the structural clarity of a document editor. 

The UI evokes a sense of "Quiet Power"—it stays out of the way until needed, then provides dense, information-rich views that prioritize performance over decoration. It follows a "Performance-Focused" style, utilizing high-density layouts, subtle micro-interactions, and a clear visual hierarchy that reduces cognitive load during intense project management workflows.

## Colors

This design system utilizes a sophisticated cold-gray palette to maintain a professional, focused atmosphere. The primary Violet and Indigo colors are reserved for actionable elements and active states.

### Core Palette
- **Primary:** Violet (#8B5CF6) — Primary actions, active navigation, and selection.
- **Accent:** Indigo (#6366F1) — Secondary actions and "Todo" status indicators.
- **Surface (Light):** Gray-50 — Main canvas background.
- **Surface (Dark):** Gray-950 — Main canvas background; Gray-900 for sidebar and nested containers.

### Functional Palette
- **Urgent:** Red-500 (#EF4444)
- **High:** Orange-500 (#F97316)
- **Medium:** Amber-500 (#F59E0B)
- **Low/Backlog:** Gray-500 (#6B7280)
- **Done:** Emerald-500 (#10B981)

## Typography

The typography system is built on **Inter**, optimized for screen readability and data density. It follows an 8px baseline grid to ensure vertical rhythm. 

- **Scale:** Small font sizes (13px/14px) are the standard for data entry and task viewing to maximize information density.
- **Tracking:** Headings use slight negative tracking (-0.01em to -0.02em) for a more "designed" look, while labels and small caps use positive tracking for legibility at small sizes.
- **Hierachy:** Weight is used more frequently than size to differentiate data types, keeping the UI compact.

## Layout & Spacing

This design system uses a **Fluid-to-Fixed** hybrid layout. Sidebars and toolbars occupy fixed widths to provide stability, while the central workspace expands to accommodate complex Kanban boards or multi-column list views.

- **Grid:** Built on an 8px increments (4, 8, 16, 24, 32, 48, 64).
- **Density:** High density is achieved by reducing vertical padding in lists (4px - 6px) and using a 12px gutter between task cards.
- **Sidebar:** A collapsible 240px sidebar provides the primary navigation, utilizing a "workspace switcher" at the top-most level.

## Elevation & Depth

Visual hierarchy is managed through **Tonal Layering** and purposeful shadows.

- **Levels:** 
  - **Base:** The primary background (Gray-50 or Gray-950).
  - **Flat:** Sidebar and secondary panels (Gray-100 or Gray-900). No shadow.
  - **Raised:** Cards and buttons. Uses `shadow-sm` (subtle) to create a 1px-look separation from the canvas.
  - **Overlay:** Command palette and Modals. Uses `shadow-2xl` with a 20% opacity black tint and a background blur (12px) to focus the user on the task at hand.
- **Borders:** Subtle 1px borders (#E5E7EB for light, #1F2937 for dark) are used as the primary separator instead of large shadows.

## Shapes

The shape language balances modern approachability with professional structure.

- **Components (Buttons, Chips, Inputs):** 8px (md) radius. This creates a cohesive, "contained" look for interactive elements.
- **Containers (Cards, Modals, Panels):** 12px (lg) radius. This provides a clear structural distinction between "the page" and "the content."
- **Icons:** Use a 1.5px or 2px stroke width with slightly rounded joins to match the typography.

## Components

### Buttons & Inputs
- **Primary Button:** Solid #8B5CF6 with white text. 8px radius. Subtle inner-glow for depth.
- **Input Fields:** Gray-50/Gray-900 background with a 1px border. Focus state uses a 2px Indigo ring.

### Task Cards
- **Structure:** Vertical stack. Title (Semi-bold 14px), followed by a metadata row.
- **Metadata Icons:** 14x14px icons for attachments, comments, and subtask counts, rendered in Gray-500.
- **Priority Indicator:** A small colored dot or vertical bar on the left edge of the card.

### Lists & Boards
- **List View:** Single-line density. Hovering a row reveals quick actions (Assign, Due Date).
- **Kanban Board:** Fixed-width columns (320px). Ghost-state preview when dragging cards.

### Command Palette (Cmd+K)
- **Styling:** Centered, 640px width. Heavy shadow (`shadow-2xl`). 
- **Interaction:** Instant filter as the user types. First result is auto-selected with a Violet background.

### Sidebar & Navigation
- **Workspace Switcher:** A compact dropdown in the top-left, showing the organization avatar and name.
- **Navigation Items:** 13px font size, Gray-500 text. Active state uses Violet text and a subtle Gray-800/200 background highlight.