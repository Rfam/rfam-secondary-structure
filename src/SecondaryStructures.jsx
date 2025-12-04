import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './SecondaryStructures.css';

const SecondaryStructure = ({
  familyAcc,
  imageTypes = ['rscape', 'cons', 'norm', 'cov','ent','maxcm','fcbp','rchie','rscape-cyk'],
  apiBaseUrl = 'rfam',  
  varnaEnabled = true,
}) => {
  const [selectedImageType, setSelectedImageType] = useState(imageTypes[0] || 'rscape');
  const [svgContent, setSvgContent] = useState('');
  const [imageStatus, setImageStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [availableTypes, setAvailableTypes] = useState([]);

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

      // If image is not available, Rfam returns a 'not availbele' PNG image
      
      // Verify that it's actually SVG content
      if (!content.includes('<svg') && !contentType.includes('image/png')) {
        throw new Error('Response does not contain SVG');
      }

      return content;
    } catch (error) {
      console.warn(`Failed to load ${type}:`, error);
      return null;
    }
  }, [buildImageUrl]);

  const tryLoadImage = useCallback(async (types) => {
    setImageStatus('loading');
    
    for (const type of types) {
      const svg = await loadImage(type);
      
      if (svg) {
        setSvgContent(svg);
        setSelectedImageType(type);
        setImageStatus('loaded');
        return true;
      }
    }

    setImageStatus('error');
    setErrorMessage('No secondary structure images available for this family.');
    return false;
  }, [loadImage]);

  useEffect(() => {
    const initializeImages = async () => {

      const available = []
      
      for (const type of imageTypes) {
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
  }, [familyAcc, imageTypes, checkImageAvailability, tryLoadImage]);

  const handleImageTypeChange = useCallback(async (type) => {
    if (type === selectedImageType) return;
    
    setImageStatus('loading');
    setSelectedImageType(type);
    
    const svg = await loadImage(type);
    
    if (svg) {
      setSvgContent(svg);
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
    
    const blob = svgContent.includes('<svg') ? new Blob([svgContent], { type: 'image/svg+xml' }) : new Blob([svgContent], { type: 'image/png' })
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = svgContent.includes('<svg') ? `${familyAcc}_${selectedImageType}_structure.svg` : null
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [svgContent, familyAcc, selectedImageType]);

  const getImageTypeLabel = (type) => {
    const labels = {
      rscape: 'R-scape',
      cons: 'cons',
      fcbp: 'bpcons',
      cov: 'cov',
      ent: 'ent',
      maxcm: 'maxcm',
      norm: 'norm',
      rchie: 'rchie',
    };
    return labels[type] || type.toUpperCase();
  };

  return (
    <div className="secondary-structures-tab">
      <div className="ss-controls">
        {availableTypes.length > 1 && (
          <div className="ss-control-group">
            <label htmlFor="image-type-select">Visualisation Type:</label>
            <select
              id="image-type-select"
              value={selectedImageType}
              onChange={(e) => handleImageTypeChange(e.target.value)}
              disabled={imageStatus === 'loading'}
              key={selectedImageType}
            >
              {availableTypes.map(type => (
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
          {imageStatus === 'loaded' && (
            <button onClick={downloadImage} title="Download current image">
              Download Image
            </button>
          )}
        </div>
      </div>

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

        {
          imageStatus === 'loaded' && svgContent && !svgContent.includes('<svg') && (
            <div className="ss-image-container">  
                <div 
                  className="ss-svg-wrapper"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
            </div>
          )
        }

        {imageStatus === 'loaded' && svgContent && (
          <div className="ss-image-container">
            <div className="ss-info-text">
              {/* Click on the structure to toggle display of sequence labels and base pairs */}
            </div>
            <div 
              className="ss-svg-wrapper"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

SecondaryStructure.propTypes = {
  familyAcc: PropTypes.string.isRequired,
  imageTypes: PropTypes.arrayOf(PropTypes.string),
  apiBaseUrl: PropTypes.string,
  varnaEnabled: PropTypes.bool,
  showImageInfo: PropTypes.bool,
};

export default SecondaryStructure;