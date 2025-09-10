import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import parseGeoraster from 'georaster';
import SplitViewMap from './SplitViewMap';
import { useAppContext } from './services/Store';
import { uploadImage, createJob, getJobStatus, config } from './services/api';
import './App.css';

const App = () => {
  const { 
    imageA, setImageA, imageB, setImageB, 
    aoiBounds, setAOIBounds, setResetAOIFlag,
    jobStatus, setJobStatus,
    processedImages, setProcessedImages,
    uploadingFileName, setUploadingFileName,
    jobId, setJobId,
    showProcessed, setShowProcessed
  } = useAppContext();

  const [imageAFile, setImageAFile] = useState(null);
  const [imageBFile, setImageBFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const jobPollingInterval = useRef(null);
  const isUploading = useRef(false);

  const fetchAndParseGeoraster = async (url) => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return parseGeoraster(arrayBuffer);
  };

  const handleFileChange = (e, setImageFile) => {
    setImageFile(e.target.files[0]);
  };

  const handleUploadClick = async (file, setImage) => {
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }
    isUploading.current = true;
    setUploadingFileName(file.name);
    try {
      const { imageId, imageUrl } = await uploadImage(file);
      
      const georaster = await fetchAndParseGeoraster(imageUrl);
      
      setImage({ file, georaster, imageId, imageUrl });
      toast.success(`Loaded ${file.name}`);
    } catch (err) {
      console.error("Error loading GeoTIFF:", err);
      toast.error(`Error loading ${file.name}`);
      setImage(null);
    } finally {
      setUploadingFileName(null);
      isUploading.current = false;
    }
  };

  const handleProcessAOI = async () => {
    if (!aoiBounds) {
      toast.error('Please select an Area of Interest (AOI) first.');
      return;
    }
    if (!imageA?.imageId || !imageB?.imageId) {
      toast.error('Please upload both GeoTIFF images first.');
      return;
    }
    setIsProcessing(true);
    setJobStatus('Pending');
    try {
      const newJobId = await createJob({
        imageAId: imageA.imageId,
        imageBId: imageB.imageId,
        aoi: {
          north: aoiBounds._northEast.lat,
          south: aoiBounds._southWest.lat,
          east: aoiBounds._northEast.lng,
          west: aoiBounds._southWest.lng
        }
      });
      setJobId(newJobId);
      setJobStatus('Running');
      toast.info(`Processing job ${newJobId} started.`);
      
      jobPollingInterval.current = setInterval(async () => {
        const jobData = await getJobStatus(newJobId);
        
        const status = jobData.status.toLowerCase().trim();

        if (status === 'completed' || status === 'failed') {
          clearInterval(jobPollingInterval.current);
          setIsProcessing(false);
          setJobStatus(jobData.status);
          
          if (status === 'completed') {
            toast.success('Processing complete!');
            
            const imageAUrl = `${config.backendUrl}/api/outputs/${newJobId}/${jobData.outputA}`;
            const imageBUrl = `${config.backendUrl}/api/outputs/${newJobId}/${jobData.outputB}`;

            const georasterA = await fetchAndParseGeoraster(imageAUrl);
            const georasterB = await fetchAndParseGeoraster(imageBUrl);
            
            setProcessedImages({ 
              A: { georaster: georasterA, imageUrl: imageAUrl }, 
              B: { georaster: georasterB, imageUrl: imageBUrl } 
            });
          } else {
            toast.error(`Processing failed: ${jobData.error || 'An unknown error occurred'}`);
          }
        }
      }, 3000);
    } catch (err) {
      setIsProcessing(false);
      setJobStatus('Failed');
      console.error(err);
      toast.error('Failed to start processing job.');
    }
  };

  const handleResetAOI = () => {
    setAOIBounds(null);
    setResetAOIFlag(prev => !prev);
    toast.info('AOI has been reset.');
  };
  
  const handleAoiCreated = useCallback((bounds) => {
    setAOIBounds(bounds);
    toast.success('Area of Interest selected!');
  }, [setAOIBounds]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return '#ffc107';
      case 'Running': return '#007bff';
      case 'completed': return '#28a745';
      case 'failed': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div className="App">
      <ToastContainer />
      <div className="header">
        <h1>GeoTIFF Split-View Processor</h1>
      </div>
      <div className="main-content">
        <div className="control-panel">
          <h2>Upload GeoTIFFs</h2>
          <div className="file-input-group">
            <label>Image A (Left):</label>
            <input type="file" accept=".tif,.tiff" onChange={(e) => handleFileChange(e, setImageAFile)} disabled={isUploading.current || isProcessing} />
            <button onClick={() => handleUploadClick(imageAFile, setImageA)} disabled={!imageAFile || isUploading.current || isProcessing}>
              Upload A
            </button>
            {imageA && <p className="file-info">{imageA.file.name} ({(imageA.file.size / 1024 / 1024).toFixed(2)} MB)</p>}
          </div>
          <div className="file-input-group">
            <label>Image B (Right):</label>
            <input type="file" accept=".tif,.tiff" onChange={(e) => handleFileChange(e, setImageBFile)} disabled={isUploading.current || isProcessing} />
            <button onClick={() => handleUploadClick(imageBFile, setImageB)} disabled={!imageBFile || isUploading.current || isProcessing}>
              Upload B
            </button>
            {imageB && <p className="file-info">{imageB.file.name} ({(imageB.file.size / 1024 / 1024).toFixed(2)} MB)</p>}
          </div>
          <h2>Area of Interest</h2>
          <div className="aoi-info">
            {aoiBounds ? (
              <div>
                <p>AOI Bounds:</p>
                <p>SW: [{aoiBounds._southWest.lat.toFixed(4)}, {aoiBounds._southWest.lng.toFixed(4)}]</p>
                <p>NE: [{aoiBounds._northEast.lat.toFixed(4)}, {aoiBounds._northEast.lng.toFixed(4)}]</p>
                <button onClick={handleResetAOI} className="reset-btn">Reset AOI</button>
              </div>
            ) : (<p>Draw a rectangle on the map to define an AOI.</p>)}
          </div>
          <button onClick={handleProcessAOI} disabled={!imageA?.georaster || !imageB?.georaster || !aoiBounds || isProcessing || isUploading.current} className="process-btn">
            {isProcessing ? 'Processing...' : 'Process AOI'}
          </button>
          {jobStatus && (
            <div className="job-status-container">
              <h3>Job Status: <span className="status-chip" style={{ backgroundColor: getStatusColor(jobStatus) }}>{jobStatus}</span></h3>
              {jobStatus === 'completed' && <h4>Job ID: {jobId}</h4>}
            </div>
          )}
          {jobStatus === 'completed' && processedImages.A && (
            <div className="output-toggle">
              <label>
                <input type="checkbox" checked={showProcessed} onChange={(e) => setShowProcessed(e.target.checked)} />
                Show processed outputs
              </label>
            </div>
          )}
        </div>
        <div className="map-container">
          <SplitViewMap
            imageA={imageA}
            imageB={imageB}
            onAoiCreated={handleAoiCreated}
            resetAoi={!aoiBounds}
            showProcessed={showProcessed}
            processedImages={processedImages}
          />
        </div>
      </div>
      {isUploading.current && (
        <div className="upload-popup-overlay">
          <div className="upload-popup-content">
            <h3>Uploading...</h3>
            <p>Please wait while `{uploadingFileName}` is uploaded to the server.</p>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;