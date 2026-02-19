# Rfam Secondary Structures

A reusable React component for visualizing RNA secondary structures from the Rfam database. Supports embedding as a React component or as a standalone bundle for non-React applications.

## Installation

### As a React Component


```jsx
import SecondaryStructure from 'rfam-secondary-structures';

function App() {
  return (
    <SecondaryStructure
      familyAcc="RF00001"
      apiBaseUrl="https://rfam.org/family"
      imageTypes={['rscape', 'cons', 'norm']}
      varnaEnabled={true}
      showLegend={true}
      showDescription={true}
    />
  );
}
```

### As a Standalone Bundle

For non-React applications, use the standalone build which bundles all dependencies and auto-mounts on page load.

**CDN Links (Production):**

```html
<link rel="stylesheet" href="https://rfam.github.io/rfam-secondary-structure/secondary-structures.css">
<script src="https://rfam.github.io/rfam-secondary-structure/secondary-structures.min.js"></script>
```

#### Auto-Mount Usage

Add a container element with `data-rfam-ss` attribute and configuration via data attributes:

```html
<div
  data-rfam-ss
  data-family-acc="RF00001"
  data-api-base-url="https://rfam.org/family"
  data-image-types="rscape,cons,norm"
  data-varna-enabled="true"
  data-show-legend="true"
  data-show-description="true">
</div>

<link rel="stylesheet" href="https://rfam.github.io/rfam-secondary-structure/secondary-structures.css">
<script src="https://rfam.github.io/rfam-secondary-structure/secondary-structures.min.js"></script>
```

The component will automatically initialize when the DOM is ready.

#### Manual Mount Usage

For programmatic control, use the global `RfamSecondaryStructures` object:

```html
<div id="ss-container"></div>

<link rel="stylesheet" href="https://rfam.github.io/rfam-secondary-structure/secondary-structures.css">
<script src="https://rfam.github.io/rfam-secondary-structure/secondary-structures.min.js"></script>

<script>
  const container = document.getElementById('ss-container');
  window.RfamSecondaryStructures.mount(container, {
    familyAcc: 'RF00001',
    apiBaseUrl: 'https://rfam.org/family',
    imageTypes: ['rscape', 'cons', 'norm'],
    varnaEnabled: true,
    showLegend: true,
    showDescription: true
  });
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `familyAcc` | string | *required* | Rfam family accession (e.g., 'RF00001') |
| `apiBaseUrl` | string | `'rfam'` | Base URL for API calls |
| `imageTypes` | string[] | `['rscape', 'cons', 'norm', 'cov', 'ent', 'maxcm', 'fcbp', 'rchie']` | Visualization types to display |
| `varnaEnabled` | boolean | `true` | Show VARNA viewer button |
| `showLegend` | boolean | `true` | Show visualization legend |
| `showDescription` | boolean | `true` | Show type descriptions |

## Visualization Types

| Type | Description |
|------|-------------|
| `rscape` | R-scape structure with covariation support |
| `cons` | Sequence conservation (0-100%) |
| `fcbp` | Basepair conservation percentage |
| `cov` | Covariation analysis (-2 to +2) |
| `ent` | Sequence entropy |
| `maxcm` | Maximum parse of covariance model |
| `norm` | Normal stem-loop coloring |
| `rchie` | R-chie arc diagrams |

## Development

```bash
# Install dependencies
npm install

# Start dev server (port 3001)
npm run dev

# Build library (for React apps)
npm run build:lib

# Build standalone (for non-React apps)
npm run build:standalone
```

## Build Outputs

- **Library build:** `dist/index.js` - UMD module with external React dependencies
- **Standalone build:** `dist/standalone/secondary-structures.min.js` + `dist/standalone/secondary-structures.css` - Self-contained bundle with all dependencies
