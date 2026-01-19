import React from 'react';
import { createRoot } from 'react-dom/client';
import SecondaryStructure from './SecondaryStructures.jsx';
import './SecondaryStructures.css';

// Auto-mount function for embedding in non-React apps
function mountSecondaryStructures(container, props) {
  if (!container) {
    console.error('SecondaryStructures: No container element provided');
    return null;
  }

  const root = createRoot(container);
  root.render(<SecondaryStructure {...props} />);
  return root;
}

// Auto-initialize on DOM ready if data-rfam-ss containers exist
function autoInit() {
  const containers = document.querySelectorAll('[data-rfam-ss]');

  containers.forEach((container) => {
    const familyAcc = container.dataset.familyAcc;
    const apiBaseUrl = container.dataset.apiBaseUrl || '/family';
    const imageTypesAttr = container.dataset.imageTypes;
    const varnaEnabled = container.dataset.varnaEnabled !== 'false';
    const showLegend = container.dataset.showLegend !== 'false';
    const showDescription = container.dataset.showDescription !== 'false';

    const imageTypes = imageTypesAttr
      ? imageTypesAttr.split(',').map(t => t.trim())
      : ['rscape', 'cons', 'norm', 'cov', 'ent', 'maxcm', 'fcbp', 'rchie'];

    if (!familyAcc) {
      console.error('SecondaryStructures: data-family-acc attribute is required');
      return;
    }

    mountSecondaryStructures(container, {
      familyAcc,
      apiBaseUrl,
      imageTypes,
      varnaEnabled,
      showLegend,
      showDescription,
    });
  });
}

// Run auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  autoInit();
}

// Expose for manual mounting
window.RfamSecondaryStructures = {
  mount: mountSecondaryStructures,
  SecondaryStructure,
};
