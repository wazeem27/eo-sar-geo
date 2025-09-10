import axios from "axios";

export const config = {
  backendUrl: 'http://localhost:8080',
};

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await axios.post(`${config.backendUrl}/api/uploads`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const imageUrl = `${config.backendUrl}/api/files/${res.data.imageId}`;
    
    return {
      imageId: res.data.imageId,
      imageUrl,
    };
  } catch (error) {
    console.error("Error during image upload:", error);
    throw error;
  }
};

export const createJob = async ({ imageAId, imageBId, aoi }) => {
  try {
    const res = await axios.post(`${config.backendUrl}/api/jobs`, {
      imageAId,
      imageBId,
      aoi,
    });
    return res.data.jobId;
  } catch (error) {
    console.error("Error creating job:", error);
    throw error;
  }
};

export const getJobStatus = async (jobId) => {
  try {
    const res = await axios.get(`${config.backendUrl}/api/jobs/${jobId}`);
    const job = res.data;
    return job;
  } catch (error) {
    console.error("Error fetching job status:", error);
    throw error;
  }
};