# @melchi/design-system

Svelte 5 / SvelteKit UI component library, design system primitives, and client-side utilities.

## Overview

`@melchi/design-system` provides a reusable library of accessible Svelte 5 components built with Tailwind CSS and Bits UI primitives, along with shared UI icons, drawer/toast state management, and class name merge utilities.

## Features & Included Components

### Components

- **Buttons & Actions**: `Button`, `ConfirmButton`, `CTA`, `FAB` (Floating Action Button with portable state)
- **Forms & Inputs**: `Input`, `Textarea`, `Checkbox`, `Dropdown`
- **Feedback & Overlays**: `Alert`, `Toast` (with reactive `toaster.svelte.ts`), `Drawer` (with reactive `drawer-state.svelte.ts`), `Spinner`
- **Data Display**: `List`, `CollapsibleGroup`, `ImageList`, `AudioDisplay`, `Quote`

### Icons

Extensive set of SVG icon components:

- Navigation: `ArrowRightIcon`, `BackArrowIcon`, `ChevronDownIcon`, `ChevronUpIcon`, `ChevronLeftIcon`, `ChevronRightIcon`, `CloseIcon`
- Status & Verification: `CheckIcon`, `CheckStrokeIcon`, `VerifiedIcon`, `UnverifiedIcon`, `CircleQuestion`
- Actions & Utilities: `AddPhoto`, `AddRecording`, `TrashIcon`, `NotePencil`, `RefreshCwIcon`, `Sliders`, `WrenchIcon`, `EyeIcon`, `EyeOffIcon`, `DotsThree`, `GoogleIcon`, `DashboardIcon`, `FeedbackIcon`, `CommunicationsIcon`, `SeedsIcon`, `GTtR`, `UserProfileIcon`

### Utilities

- `cc(...inputs)`: Tailwind class merger powered by `clsx` and `tailwind-merge`
- `isDefined<T>(val)`: Type-safe non-nullable value guard

## Development & Usage

### Install Dependencies

From the repository root:

```bash
npm install
```

### Run Dev Showcase Server

```bash
npm run dev --workspace=@melchi/design-system
```

### Run Type & Svelte Checks

```bash
npm run check --workspace=@melchi/design-system
```

### Build & Package for Distribution

```bash
npm run build --workspace=@melchi/design-system
```

Outputs the packaged library into `dist/` ready for npm packaging via `svelte-package` and `publint`.
