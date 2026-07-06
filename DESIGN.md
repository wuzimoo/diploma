# BauPilot Design V02

## Reference Synthesis

### Attio
- Dense but calm product shell with strong hierarchy.
- Cold-neutral workspace surfaces, sharp information grouping, restrained shadows.
- Navigation feels like product infrastructure, not marketing chrome.
- Tables, cards, filters and pills use a compact rhythm with clear border logic.
- Typography pairs a highly legible sans with a more expressive display face.

### BauPilot by Kairos
- Warm construction-friendly background with lighter card surfaces.
- Strong use of rounded containers, pill controls and technical labels.
- Archivo for headers, Public Sans for body, IBM Plex Mono for small technical metadata.
- Accent is used sparingly for high-intent actions and state focus.

## V02 Design Direction

### Theme
- Product-first operational workspace.
- Attio information density with Kairos warmth.
- Desktop should feel like a modern ops platform.
- Mobile should feel like a compact field console, not a shrunk desktop page.

### Palette
- Canvas: `#F4F0E8`
- Canvas tint: `#EEE7DB`
- Surface: `rgba(255,255,255,0.82)`
- Surface strong: `#FCFAF6`
- Surface muted: `#F3EEE4`
- Border soft: `#D7D0C2`
- Border strong: `#B8AF9C`
- Text primary: `#182026`
- Text secondary: `#5E6764`
- Text tertiary: `#7C847F`
- Accent primary: `#C96A35`
- Accent dark: `#A95628`
- Accent ink: `#FDF9F4`
- Slate action: `#42586E`
- Slate action dark: `#31475C`
- Success soft: `#E6F6EA`
- Warning soft: `#FFF2DA`
- Danger soft: `#FCE7E3`

### Typography
- Display: `Archivo`
- Body: `Public Sans`
- Technical metadata: `IBM Plex Mono`
- Headings should be tight and slightly condensed.
- Labels, captions and helper text should use cleaner product spacing and smaller line-height.

### Geometry
- Shell containers: `28px` to `32px`
- Primary cards: `24px`
- Secondary cards: `18px`
- Inputs and pills: fully rounded or `16px` depending on density
- Buttons: rounded pills for primary controls, softened rectangles for utility controls

### Elevation
- Very light shadows.
- More emphasis on border separation than depth.
- Frosted translucent surfaces only on layout shells, not on every child card.

## Component Rules

### Navigation
- Desktop: persistent product sidebar + utility topbar.
- Mobile: compact bottom nav with fewer, stronger destinations.
- Settings lives as a first-class destination, not inside topbar clutter.

### Cards
- All cards must align internally with predictable zones:
  - header
  - metadata
  - main content
  - footer/actions
- Action rows should pin to the bottom.

### Forms
- Inputs should look like product controls, not static beige boxes.
- Filters and create/edit forms share the same control language.
- Labels should be short, technical and consistent.

### Progress
- Progress bars must always keep readable values.
- Numeric labels sit on a contrast chip, never directly over ambiguous background.

### Crew Assignment
- Adding/removing people should read like roster management.
- Members use row items with role/meta, not random floating pills only.
- “Add member” must feel like an inline roster panel, not a hidden afterthought.

### Settings
- Every role gets a dedicated settings page.
- Language switcher belongs there.
- Include account, role, workspace and session blocks so the page feels intentional.

## Delivery Rules
- Keep backend untouched unless UI requires data mapping only.
- New design should run against the same API and same deployment base.
- Preview deployment should use a separate Vercel URL for `newdesign` validation.
