import React, { createContext, useContext, useState } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [imageA, setImageA] = useState(null);
  const [imageB, setImageB] = useState(null);
  const [imageAUrl, setImageAUrl] = useState(null);
  const [imageBUrl, setImageBUrl] = useState(null);
  const [aoiBounds, setAOIBounds] = useState(null);
  const [resetAOIFlag, setResetAOIFlag] = useState(false);
  const [processedImages, setProcessedImages] = useState({ A: null, B: null });
  const [jobStatus, setJobStatus] = useState("Idle");
  const [uploadingFileName, setUploadingFileName] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [showProcessed, setShowProcessed] = useState(false);

  return (
    <AppContext.Provider
      value={{
        imageA,
        setImageA,
        imageB,
        setImageB,
        imageAUrl,
        setImageAUrl,
        imageBUrl,
        setImageBUrl,
        aoiBounds,
        setAOIBounds,
        resetAOIFlag,
        setResetAOIFlag,
        processedImages,
        setProcessedImages,
        jobStatus,
        setJobStatus,
        uploadingFileName,
        setUploadingFileName,
        jobId,
        setJobId,
        showProcessed,
        setShowProcessed,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);