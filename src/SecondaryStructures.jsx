import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import svgPanZoom from 'svg-pan-zoom';
import './SecondaryStructures.css';

const IMAGE_TYPE_INFO = {
  rscape: {
    label: 'R-scape',
    description: 'R-scape is a method for testing whether covariation analysis supports the presence of a conserved RNA secondary structure. This page shows R-scape analysis of the secondary structure from the Rfam seed alignment and a new structure with covariation support that is compatible with the same alignment.',
  },
  cons: {
    label: 'seqcons',
    description: 'Conservation (cons): this plot colours each character by how well conserved it is. A site with 100% sequence conservation is coloured red, 0% is violet.',
  },
  fcbp: {
    label: 'bpcons',
    description: 'Fraction of canonical basepairs (fcbp): this plot colours each base-pair by the percentage of canonical basepairs (A:U, C:G, G:U) which are found in the corresponding position in the alignment. A pair of sites with 100% canonical pairs is coloured red, a site with 0% is violet.',
  },
  cov: {
    label: 'cov',
    description: 'Covariation (cov): this plot colours each base-pair according to how much the corresponding nucleotides are co-varying. A base-pair position at which every pair of nucleotides is co-variant with respect to every other pair in the alignment gets a score of 2 and is coloured red. Conversely, a base-pair position at every pair is anti-co-variant with respect to every other pair (e.g. lots of mutations to non-canonical pairs) gets a score of -2 and is coloured violet. Further information on this metric can be found in this <a href="#">document</a>.',
  },
  ent: {
    label: 'ent',
    description: 'Sequence entropy (ent): this plot colours each character by how under- or over-represented the residues at the site are. Sites where one or more nucleotides are over-represented while the other nucleotides are either non-existent or near the background frequencies, receive positive scores; sites where all the nucleotides are under-represented receive negative scores. Further information on this metric can be found in this <a href="#">document</a>.',
  },
  maxcm: {
    label: 'maxcm',
    description: 'Maximum parse of the covariance model (maxcm): this plot takes the covariance model for the family and generates the sequence with the maximum possible score for that model. Each character is coloured by how many bits it contributes to the total score.',
  },
  norm: {
    label: 'norm',
    description: 'Normal: this plot simply colours each stem loop.',
  },
  rchie: {
    label: 'rchie',
    description: 'R-chie (rchie): arc diagrams showing secondary structure, calculated using the <a href="#">R-chie</a> package. The consensus secondary structure is visualized as arc diagrams on top of each diagram, where a basepair in an arc, connect two columns of the block of sequences below. The block of sequences below represent the multiple sequence alignment of the Rfam seed, where each sequence is a horizontal strip. Sequences in the alignments are ordered so sequences that best fit the structure are on top, and those that do not fit as well are towards the bottom. For seed alignments for over 500 sequences, 500 random sequences were chosen. Rfam entries without structure have a blank plot. Colour information can be found on the <a href="#">R-chie FAQ</a>.',
  },
};

const RSCAPE_COLORS = {
  significant: '#31a354',
  conserved97: '#d90000',
  conserved90: '#000000',
  conserved75: '#807b88',
  conserved50: '#ffffff',
};

// Image types shown in dropdown (rscape-cyk is shown alongside rscape, not separately)
const DROPDOWN_IMAGE_TYPES = ['rscape', 'cons', 'fcbp', 'cov', 'ent', 'maxcm', 'norm', 'rchie'];

const SecondaryStructure = ({
  familyAcc,
  imageTypes = ['rscape', 'cons', 'norm', 'cov', 'ent', 'maxcm', 'fcbp', 'rchie'],
  apiBaseUrl = 'rfam',
  varnaEnabled = true,
  showLegend = true,
  showDescription = true,
}) => {
  const [selectedImageType, setSelectedImageType] = useState(imageTypes[0] || 'rscape');
  const [svgContent, setSvgContent] = useState('');
  const [imageStatus, setImageStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [availableTypes, setAvailableTypes] = useState([]);
  const [rscapeStats, setRscapeStats] = useState(null);
  const [svgToggleState, setSvgToggleState] = useState(1);
  const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });
  const [loupePosition, setLoupePosition] = useState({ x: 0, y: 0, visible: false });
  const [isImageNotAvailable, setIsImageNotAvailable] = useState(false);

  // R-scape CYK (optimised) state - for side-by-side display
  const [rscapeCykContent, setRscapeCykContent] = useState('');
  const [rscapeCykStatus, setRscapeCykStatus] = useState('loading');
  const [rscapeCykStats, setRscapeCykStats] = useState(null);
  const [isRscapeCykNotAvailable, setIsRscapeCykNotAvailable] = useState(false);

  const svgContainerRef = useRef(null);
  const svgContainerCykRef = useRef(null);
  const panZoomInstanceRef = useRef(null);
  const panZoomCykInstanceRef = useRef(null);
  const rchieImageRef = useRef(null);

  const buildImageUrl = useCallback((type) => {
    return `${apiBaseUrl}/${familyAcc}/image/${type}`;
  }, [apiBaseUrl, familyAcc]);

  const buildVarnaUrl = useCallback(() => {
    return `${apiBaseUrl}/${familyAcc}/varna`;
  }, [apiBaseUrl, familyAcc]);

  const checkImageAvailability = useCallback(async (type) => {
    try {
      const url = buildImageUrl(type);
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'cors'
      });
      return response.ok;
    } catch (error) {
      console.warn(`Availability check failed for ${type}:`, error);
      return false;
    }
  }, [buildImageUrl]);

  const loadImage = useCallback(async (type) => {
    const url = buildImageUrl(type);

    try {
      const response = await fetch(url, { mode: 'cors' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const content = await response.text();
      const contentType = response.headers.get('content-type') || '';
      const isSvg = content.includes('<svg');
      const isPng = contentType.includes('image/png');

      // If image is not available, Rfam returns a 'not available' PNG image
      // R-chie is legitimately a PNG, other types should be SVG
      if (!isSvg && !isPng) {
        throw new Error('Response does not contain valid image');
      }

      // For non-R-chie types, PNG means "not available"
      const isActuallyAvailable = isSvg || type === 'rchie';

      return { content, isAvailable: isActuallyAvailable, isSvg };
    } catch (error) {
      console.warn(`Failed to load ${type}:`, error);
      return null;
    }
  }, [buildImageUrl]);

  const tryLoadImage = useCallback(async (types) => {
    setImageStatus('loading');
    setIsImageNotAvailable(false);

    for (const type of types) {
      const result = await loadImage(type);

      if (result) {
        setSvgContent(result.content);
        setSelectedImageType(type);
        setIsImageNotAvailable(!result.isAvailable);
        setImageStatus('loaded');
        return true;
      }
    }

    setImageStatus('error');
    setErrorMessage('No secondary structure images available for this family.');
    return false;
  }, [loadImage]);

  // Load R-scape CYK (optimised structure) alongside main R-scape
  const loadRscapeCyk = useCallback(async () => {
    setRscapeCykStatus('loading');
    setIsRscapeCykNotAvailable(false);
    setRscapeCykStats(null);

    const result = await loadImage('rscape-cacofold');

    if (result) {
      setRscapeCykContent(result.content);
      setIsRscapeCykNotAvailable(!result.isAvailable);
      setRscapeCykStatus('loaded');
    } else {
      setRscapeCykStatus('error');
      setIsRscapeCykNotAvailable(true);
    }
  }, [loadImage]);

  // Initialize pan/zoom for R-scape images
  const initializePanZoom = useCallback((containerRef, panZoomRef) => {
    if (panZoomRef.current) {
      panZoomRef.current.destroy();
      panZoomRef.current = null;
    }

    const svgElement = containerRef.current?.querySelector('svg');
    if (!svgElement) return;

    // Ensure minimum dimensions
    const width = parseInt(svgElement.getAttribute('width')) || 400;
    const height = parseInt(svgElement.getAttribute('height')) || 400;
    if (width < 400) svgElement.setAttribute('width', 400);
    if (height < 400) svgElement.setAttribute('height', 400);

    try {
      panZoomRef.current = svgPanZoom(svgElement, {
        controlIconsEnabled: true,
        fit: true,
        center: true,
        minZoom: 0.5,
        maxZoom: 10,
      });
    } catch (error) {
      console.warn('Failed to initialize pan/zoom:', error);
    }
  }, []);

  // Process R-scape SVG - add tooltips and calculate stats
  const processRscapeSvg = useCallback((containerRef, setStats) => {
    const svgElement = containerRef.current?.querySelector('svg');
    if (!svgElement) return;

    let basepairs = 0;
    let significantBasepairs = 0;

    // Process tspans (nucleotides)
    const tspans = svgElement.querySelectorAll('tspan');
    tspans.forEach((tspan) => {
      const fill = tspan.getAttribute('fill');
      const nucleotide = tspan.textContent;
      let title = '';

      let displayNucleotide = nucleotide;
      if (nucleotide === 'R') displayNucleotide = 'G or A';
      else if (nucleotide === 'Y') displayNucleotide = 'C or U';

      if (fill === RSCAPE_COLORS.conserved97) {
        title = `${displayNucleotide} present >97%`;
      } else if (fill === RSCAPE_COLORS.conserved90 && nucleotide !== "5'") {
        title = `${displayNucleotide} present 90-97%`;
      } else if (fill === RSCAPE_COLORS.conserved75) {
        title = `${displayNucleotide} present 75-90%`;
      } else if (fill === RSCAPE_COLORS.conserved50) {
        title = `${displayNucleotide} present 50-75%`;
      }

      if (title) {
        tspan.style.cursor = 'pointer';
        tspan.dataset.tooltip = title;
      }
    });

    // Process paths (basepairs and circles)
    const paths = svgElement.querySelectorAll('path');
    paths.forEach((path) => {
      const fill = path.getAttribute('fill');
      const strokeWidth = path.getAttribute('stroke-width');
      let title = '';

      if (fill === RSCAPE_COLORS.significant) {
        title = 'Significant basepair';
        significantBasepairs++;
      } else if (fill === RSCAPE_COLORS.conserved97) {
        title = 'Nucleotide present 97%';
      } else if (fill === RSCAPE_COLORS.conserved90) {
        title = 'Nucleotide present 90%';
      } else if (fill === RSCAPE_COLORS.conserved75) {
        title = 'Nucleotide present 75%';
      } else if (fill === RSCAPE_COLORS.conserved50) {
        title = 'Nucleotide present 50%';
      }

      if (strokeWidth === '1.44') {
        basepairs++;
      }

      if (title) {
        path.style.cursor = 'pointer';
        path.dataset.tooltip = title;
      }
    });

    // Remove R-scape title if present
    const titleElement = svgElement.querySelector('#text1000');
    if (titleElement) titleElement.remove();

    setStats({ basepairs, significantBasepairs });
  }, []);

  // Handle SVG mouse events for tooltips
  const handleSvgMouseMove = useCallback((e) => {
    const target = e.target;
    const tooltipText = target.dataset?.tooltip;

    if (tooltipText) {
      setTooltip({
        visible: true,
        content: tooltipText,
        x: e.clientX + 10,
        y: e.clientY - 28,
      });
    } else {
      setTooltip((prev) => ({ ...prev, visible: false }));
    }
  }, []);

  const handleSvgMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  // Toggle SVG element visibility (for non-R-scape images)
  const handleSvgClick = useCallback(() => {
    if (selectedImageType === 'rscape' || selectedImageType === 'rchie') return;

    const svgElement = svgContainerRef.current?.querySelector('svg');
    if (!svgElement) return;

    const seq = svgElement.querySelector('#seq');
    const lines = svgElement.querySelector('#outline');
    const pairs = svgElement.querySelector('#pairs');

    if (!seq && !lines && !pairs) return;

    const newState = svgToggleState === 3 ? 1 : svgToggleState + 1;

    if (newState === 1) {
      // Show all
      if (seq) seq.style.visibility = 'visible';
      if (lines) lines.style.visibility = 'visible';
      if (pairs) pairs.style.visibility = 'visible';
    } else if (newState === 2) {
      // Hide sequences, show structure
      if (seq) seq.style.visibility = 'hidden';
      if (lines) lines.style.visibility = 'visible';
      if (pairs) pairs.style.visibility = 'visible';
    } else if (newState === 3) {
      // Show sequences only
      if (seq) seq.style.visibility = 'visible';
      if (lines) lines.style.visibility = 'hidden';
      if (pairs) pairs.style.visibility = 'hidden';
    }

    setSvgToggleState(newState);
  }, [selectedImageType, svgToggleState]);

  // R-chie loupe functionality
  const handleRchieMouseMove = useCallback((e) => {
    if (selectedImageType !== 'rchie' || !rchieImageRef.current) return;

    const rect = rchieImageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setLoupePosition({
      x: e.clientX,
      y: e.clientY,
      bgX: x,
      bgY: y,
      visible: true,
    });
  }, [selectedImageType]);

  const handleRchieMouseLeave = useCallback(() => {
    setLoupePosition((prev) => ({ ...prev, visible: false }));
  }, []);

  const openRchiePopup = useCallback(() => {
    const url = buildImageUrl('rchie');
    window.open(url, '_blank', 'width=800,height=800');
  }, [buildImageUrl]);

  // Initial load effect
  useEffect(() => {
    const initializeImages = async () => {
      const available = [];

      // Filter to only dropdown types for availability check
      const typesToCheck = imageTypes.filter(t => DROPDOWN_IMAGE_TYPES.includes(t));

      for (const type of typesToCheck) {
        const isAvailable = await checkImageAvailability(type);
        if (isAvailable) {
          available.push(type);
        }
      }

      setAvailableTypes(available);

      if (available.length > 0) {
        await tryLoadImage(available);
      } else {
        setImageStatus('error');
        setErrorMessage('No secondary structure images available for this family.');
      }
    };

    if (familyAcc && imageTypes.length > 0) {
      initializeImages();
    }

    return () => {
      if (panZoomInstanceRef.current) {
        panZoomInstanceRef.current.destroy();
        panZoomInstanceRef.current = null;
      }
      if (panZoomCykInstanceRef.current) {
        panZoomCykInstanceRef.current.destroy();
        panZoomCykInstanceRef.current = null;
      }
    };
  }, [familyAcc, imageTypes, checkImageAvailability, tryLoadImage]);

  // Load R-scape CYK when R-scape is selected
  useEffect(() => {
    if (selectedImageType === 'rscape' && imageStatus === 'loaded') {
      loadRscapeCyk();
    }
  }, [selectedImageType, imageStatus, loadRscapeCyk]);

  // Process main R-scape SVG after content loads
  useEffect(() => {
    if (imageStatus === 'loaded' && svgContent && svgContent.includes('<svg') && selectedImageType === 'rscape') {
      const timer = setTimeout(() => {
        processRscapeSvg(svgContainerRef, setRscapeStats);
        initializePanZoom(svgContainerRef, panZoomInstanceRef);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [imageStatus, svgContent, selectedImageType, processRscapeSvg, initializePanZoom]);

  // Process R-scape CYK SVG after content loads
  useEffect(() => {
    if (rscapeCykStatus === 'loaded' && rscapeCykContent && rscapeCykContent.includes('<svg')) {
      const timer = setTimeout(() => {
        processRscapeSvg(svgContainerCykRef, setRscapeCykStats);
        initializePanZoom(svgContainerCykRef, panZoomCykInstanceRef);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [rscapeCykStatus, rscapeCykContent, processRscapeSvg, initializePanZoom]);

  // Reset toggle state when image type changes
  useEffect(() => {
    setSvgToggleState(1);
  }, [selectedImageType]);

  const handleImageTypeChange = useCallback(async (type) => {
    if (type === selectedImageType) return;

    // Cleanup previous pan/zoom instances
    if (panZoomInstanceRef.current) {
      panZoomInstanceRef.current.destroy();
      panZoomInstanceRef.current = null;
    }
    if (panZoomCykInstanceRef.current) {
      panZoomCykInstanceRef.current.destroy();
      panZoomCykInstanceRef.current = null;
    }

    setImageStatus('loading');
    setSelectedImageType(type);
    setRscapeStats(null);
    setRscapeCykStats(null);
    setIsImageNotAvailable(false);
    setRscapeCykContent('');
    setRscapeCykStatus('loading');

    const result = await loadImage(type);

    if (result) {
      setSvgContent(result.content);
      setIsImageNotAvailable(!result.isAvailable);
      setImageStatus('loaded');
    } else {
      setImageStatus('error');
      setErrorMessage(`Failed to load ${type} image.`);
    }
  }, [selectedImageType, loadImage]);

  const openVarnaViewer = useCallback(() => {
    const varnaUrl = buildVarnaUrl();
    window.open(varnaUrl, '_blank', 'width=1200,height=800');
  }, [buildVarnaUrl]);

  const downloadImage = useCallback(() => {
    if (!svgContent) return;

    const isSvg = svgContent.includes('<svg');
    const blob = isSvg
      ? new Blob([svgContent], { type: 'image/svg+xml' })
      : new Blob([svgContent], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = isSvg
      ? `${familyAcc}_${selectedImageType}_structure.svg`
      : `${familyAcc}_${selectedImageType}_structure.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [svgContent, familyAcc, selectedImageType]);

  const getImageTypeLabel = (type) => {
    return IMAGE_TYPE_INFO[type]?.label || type.toUpperCase();
  };

  const isRscapeType = selectedImageType === 'rscape';
  const isRchieType = selectedImageType === 'rchie';
  const canToggle = !isRscapeType && !isRchieType && svgContent?.includes('<svg');

  // Filter available types to only show dropdown types
  const dropdownTypes = availableTypes.filter(t => DROPDOWN_IMAGE_TYPES.includes(t));

  return (
    <div className="secondary-structures-tab">
      <div className="ss-controls">
        {dropdownTypes.length > 1 && (
          <div className="ss-control-group">
            <label htmlFor="image-type-select">Visualisation Type:</label>
            <select
              id="image-type-select"
              value={selectedImageType}
              onChange={(e) => handleImageTypeChange(e.target.value)}
              disabled={imageStatus === 'loading'}
              key={selectedImageType}
            >
              {dropdownTypes.map(type => (
                <option key={type} value={type}>{getImageTypeLabel(type)}</option>
              ))}
            </select>
          </div>
        )}

        <div className="ss-actions">
          {varnaEnabled && (
            <button onClick={openVarnaViewer} title="Open interactive VARNA viewer">
              Launch VARNA Viewer
            </button>
          )}
          {imageStatus === 'loaded' && !isImageNotAvailable && (
            <button onClick={downloadImage} title="Download current image">
              Download Image
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {showDescription && imageStatus === 'loaded' && !isImageNotAvailable && IMAGE_TYPE_INFO[selectedImageType] && (
        <div className="ss-description">
          <p dangerouslySetInnerHTML={{ __html: IMAGE_TYPE_INFO[selectedImageType].description }} />
        </div>
      )}

      <div className="ss-content">
        {imageStatus === 'loading' && (
          <div className="ss-loading">
            <div className="ss-spinner"></div>
            <p>Loading secondary structure...</p>
          </div>
        )}

        {imageStatus === 'error' && (
          <div className="ss-error">
            <div className="ss-error-icon"></div>
            <h4>Unable to Load Structure</h4>
            <p>{errorMessage}</p>
          </div>
        )}

        {imageStatus === 'loaded' && isImageNotAvailable && (
          <div className="ss-not-available">
            <div className="ss-not-available-icon">&#128269;</div>
            <h4>Image Not Available</h4>
            <p>The {getImageTypeLabel(selectedImageType)} visualisation is not available for this family.</p>
          </div>
        )}

        {/* R-scape side-by-side view */}
        {imageStatus === 'loaded' && !isImageNotAvailable && isRscapeType && svgContent?.includes('<svg') && (
          <div className="ss-rscape-side-by-side">
            {/* Current Rfam structure */}
            <div className="ss-rscape-panel">
              <h3>Current Rfam structure</h3>
              {rscapeStats && (
                <p className="ss-rscape-stats-inline">
                  <strong>{rscapeStats.significantBasepairs}</strong> out of{' '}
                  <strong>{rscapeStats.basepairs}</strong> basepairs are significant at E-value=0.05
                </p>
              )}
              <div
                ref={svgContainerRef}
                className="ss-rscape-container"
                onMouseMove={handleSvgMouseMove}
                onMouseLeave={handleSvgMouseLeave}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            </div>

            {/* R-scape optimised structure */}
            <div className="ss-rscape-panel">
              <h3>R-scape optimised structure</h3>
              {rscapeCykStatus === 'loaded' && !isRscapeCykNotAvailable && rscapeCykStats && (
                <p className="ss-rscape-stats-inline">
                  <strong>{rscapeCykStats.significantBasepairs}</strong> out of{' '}
                  <strong>{rscapeCykStats.basepairs}</strong> basepairs are significant at E-value=0.05
                </p>
              )}
              {rscapeCykStatus === 'loaded' && isRscapeCykNotAvailable && (
                <p className="ss-rscape-stats-inline ss-not-available-inline">
                  R-scape optimised structure not available for this family.
                </p>
              )}
              {(rscapeCykStatus === 'error' || (rscapeCykStatus === 'loaded' && isRscapeCykNotAvailable)) ? null : (
                rscapeCykStatus === 'loading' ? (
                  <div className="ss-rscape-container">
                    <div className="ss-loading">
                      <div className="ss-spinner"></div>
                      <p>Loading secondary structure...</p>
                    </div>
                  </div>
                ) : rscapeCykContent?.includes('<svg') && (
                  <div
                    ref={svgContainerCykRef}
                    className="ss-rscape-container"
                    onMouseMove={handleSvgMouseMove}
                    onMouseLeave={handleSvgMouseLeave}
                    dangerouslySetInnerHTML={{ __html: rscapeCykContent }}
                  />
                )
              )}
              {rscapeCykStatus === 'error' && (
                <p className="ss-rscape-stats-inline ss-not-available-inline">
                  Failed to load R-scape optimised structure.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Non-R-scape SVG images */}
        {imageStatus === 'loaded' && !isImageNotAvailable && !isRscapeType && svgContent && svgContent.includes('<svg') && (
          <div className="ss-image-container">
            {canToggle && (
              <div className="ss-info-text">
                Click on the structure to toggle display of sequence labels and base pairs
              </div>
            )}
            <div
              ref={svgContainerRef}
              className="ss-svg-wrapper"
              onClick={canToggle ? handleSvgClick : undefined}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
        )}

        {/* R-chie special handling with loupe */}
        {imageStatus === 'loaded' && !isImageNotAvailable && isRchieType && (
          <div className="ss-image-container ss-rchie-container">
            <div className="ss-info-text">
              Move your mouse over the image to magnify, click to open full image
            </div>
            <div
              className="ss-rchie-wrapper"
              onMouseMove={handleRchieMouseMove}
              onMouseLeave={handleRchieMouseLeave}
              onClick={openRchiePopup}
            >
              <img
                ref={rchieImageRef}
                src={buildImageUrl('rchie')}
                alt="R-chie secondary structure"
                className="ss-rchie-image"
              />
            </div>
          </div>
        )}
      </div>

      {/* R-scape Legend and Tips */}
      {showLegend && imageStatus === 'loaded' && !isImageNotAvailable && isRscapeType && (
        <div className="ss-rscape-footer">
          <div className="ss-legend ss-rscape-legend">
            <h4>Legend</h4>
            <ul>
              <li className="legend-label">Colours</li>
              <li>
                <span className="legend-color significant-basepair"></span>
                Statistically significant basepair with covariation
              </li>
              <li>
                <span className="legend-color conserved-97"></span>
                97% conserved nucleotide
              </li>
              <li>
                <span className="legend-color conserved-90"></span>
                90% conserved nucleotide
              </li>
              <li>
                <span className="legend-color conserved-75"></span>
                75% conserved nucleotide
              </li>
              <li>
                <span className="legend-color conserved-50"></span>
                50% conserved nucleotide
              </li>
              <li className="legend-label">Nucleotides</li>
              <li><strong>R</strong>: A or G</li>
              <li><strong>Y</strong>: C or U</li>
            </ul>
            <p className="ss-legend-tip">
              <strong>Tip:</strong> The diagrams are <strong>interactive</strong> -
              you can <strong>pan</strong> and <strong>zoom</strong> to see more details
              or <strong>hover</strong> over nucleotides and basepairs.
            </p>
          </div>
        </div>
      )}

      {/* R-chie Legend */}
      {showLegend && imageStatus === 'loaded' && !isImageNotAvailable && isRchieType && (
        <div className="ss-legend ss-rchie-legend">
          <h4>Legend</h4>
          <ul>
            <li className="legend-label">Arc colours</li>
            <li>
              <span className="legend-color arc-full"></span>
              100% canonical basepair
            </li>
            <li>
              <span className="legend-color arc-half"></span>
              50%
            </li>
            <li>
              <span className="legend-color arc-none"></span>
              0%
            </li>
            <li className="legend-label">Nucleotide colours</li>
            <li>
              <span className="legend-color nuc-valid"></span>
              Valid basepairing
            </li>
            <li>
              <span className="legend-color nuc-two-sided"></span>
              Two-sided covariation
            </li>
            <li>
              <span className="legend-color nuc-one-sided"></span>
              One-sided covariation
            </li>
            <li>
              <span className="legend-color nuc-invalid"></span>
              Invalid
            </li>
            <li>
              <span className="legend-color nuc-unpaired"></span>
              Unpaired
            </li>
            <li>
              <span className="legend-color nuc-gap"></span>
              Gap
            </li>
            <li>
              <span className="legend-color nuc-ambiguous"></span>
              Ambiguous
            </li>
          </ul>
        </div>
      )}

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="ss-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Loupe magnifier for R-chie */}
      {loupePosition.visible && isRchieType && rchieImageRef.current && (
        <div
          className="ss-loupe"
          style={{
            left: loupePosition.x - 100,
            top: loupePosition.y - 100,
            backgroundImage: `url(${buildImageUrl('rchie')})`,
            backgroundPosition: `-${loupePosition.bgX * 2 - 100}px -${loupePosition.bgY * 2 - 100}px`,
          }}
        />
      )}
    </div>
  );
};

SecondaryStructure.propTypes = {
  familyAcc: PropTypes.string.isRequired,
  imageTypes: PropTypes.arrayOf(PropTypes.string),
  apiBaseUrl: PropTypes.string,
  varnaEnabled: PropTypes.bool,
  showLegend: PropTypes.bool,
  showDescription: PropTypes.bool,
};

export default SecondaryStructure;
