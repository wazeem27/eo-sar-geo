import os
import sys
import argparse
import rasterio
import json
import logging
import requests
from requests.exceptions import RequestException
import numpy as np
from rasterio.mask import mask
from rasterio.enums import Resampling
from pyproj import CRS, Transformer
from pyproj.exceptions import CRSError
from shapely.geometry import shape
from shapely.ops import transform
from rasterio.warp import reproject, Resampling


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)

def reproject_geojson_to_crs(geojson, target_crs):
    """
    Reprojects a GeoJSON object to a specified CRS.
    """
    try:
        source_crs = CRS.from_epsg(4326)
        
        transformer = Transformer.from_crs(source_crs, target_crs, always_xy=True)

        def reproject_coords(x, y, z=None):
            return transformer.transform(x, y)

        reprojected_geojson = {
            "type": geojson["type"],
            "features": []
        }
        
        for feature in geojson['features']:
            geom = shape(feature['geometry'])
            reprojected_geom = transform(reproject_coords, geom)
            
            reprojected_feature = {
                "type": "Feature",
                "geometry": reprojected_geom.__geo_interface__,
                "properties": feature['properties']
            }
            reprojected_geojson["features"].append(reprojected_feature)

        return reprojected_geojson

    except CRSError as e:
        logging.error(f"CRS Transformation Error: {e}")
        return None
    except Exception as e:
        logging.error(f"Failed to reproject GeoJSON: {e}")
        return None


def clip_and_align_images(image_a_path, image_b_path, aoi_geojson, output_dir):
    """
    Clips and aligns two GeoTIFF images based on a GeoJSON AOI.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    output_a = os.path.join(output_dir, "A_clipped.tif")
    output_b_aligned = os.path.join(output_dir, "B_clipped_aligned.tif")

    try:
        logging.info(f"Clipping image A from {image_a_path}...")
        with rasterio.open(image_a_path) as src_a:
            reprojected_aoi_a = reproject_geojson_to_crs(aoi_geojson, src_a.crs)
            clipped_a, out_transform_a = mask(src_a, [shape(f['geometry']) for f in reprojected_aoi_a['features']], crop=True)

            out_meta_a = src_a.meta.copy()
            out_meta_a.update({
                "driver": "GTiff",
                "height": clipped_a.shape[1],
                "width": clipped_a.shape[2],
                "transform": out_transform_a,
                "crs": src_a.crs
            })

            with rasterio.open(output_a, "w", **out_meta_a) as dest_a:
                dest_a.write(clipped_a)
            
            logging.info(f"Clipped image A saved to {output_a}")

            logging.info(f"Clipping and aligning image B from {image_b_path}...")
            with rasterio.open(image_b_path) as src_b:
                data_b = src_b.read()
                
                with rasterio.open(output_b_aligned, 'w', **out_meta_a) as dest_b:
                    reproject(
                        source=data_b,
                        destination=rasterio.band(dest_b, 1), 
                        src_transform=src_b.transform,
                        src_crs=src_b.crs,
                        dst_transform=out_meta_a['transform'],
                        dst_crs=out_meta_a['crs'],
                        resampling=Resampling.bilinear,
                        num_threads=os.cpu_count()
                    )

            logging.info(f"Clipped and aligned image B saved to {output_b_aligned}")
            
        return "A_clipped.tif", "B_clipped_aligned.tif"

    except rasterio.errors.RasterioIOError as e:
        raise Exception(f"RasterioIOError: {e}")
    except Exception as e:
        raise Exception(f"Processing failed: {e}")


def post_status_update(job_id, status, callback_url, output_a=None, output_b=None, error=None):
    """
    Posts a status update to the API.
    """
    data = {
        "jobId": job_id,
        "status": status,
    }
    if output_a:
        data["outputA"] = output_a
    if output_b:
        data["outputB"] = output_b
    if error:
        data["error"] = error

    logging.info(f"Posting status update to {callback_url} with data: {data}")
    try:
        response = requests.post(callback_url, json=data)
        response.raise_for_status()
        logging.info("Successfully posted status update to " + callback_url)
    except RequestException as e:
        logging.error(f"Failed to post status update: {e}")


def main():
    """
    Main function to parse arguments and run the worker.
    """
    parser = argparse.ArgumentParser(description="Image Processing Worker")
    parser.add_argument("--job-id", required=True, help="ID of the processing job")
    parser.add_argument("--image-a", required=True, help="Path or ID of the first image GeoTIFF")
    parser.add_argument("--image-b", required=True, help="Path or ID of the second image GeoTIFF")
    parser.add_argument("--aoi", required=True, help="Path to the AOI GeoJSON file")
    parser.add_argument("--callback-url", required=True, help="URL to post status updates")
    
    args = parser.parse_args()

    data_dir = os.environ.get("DATA_DIR", "/app/data")
    uploads_dir = os.path.join(data_dir, "uploads")
    outputs_dir = os.path.join(data_dir, "outputs", args.job_id)

    logging.info("Worker logging initialized.")
    logging.info(f"Starting worker for job {args.job_id}")

    try:
        image_a_path = os.path.join(uploads_dir, f"{args.image_a}.tif")
        image_b_path = os.path.join(uploads_dir, f"{args.image_b}.tif")
        aoi_path = args.aoi

        logging.info("Starting image processing...")
        logging.info(f"Checking for files: {image_a_path}, {image_b_path}, {aoi_path}")
        
        # Check if all files exist before proceeding
        if not os.path.exists(image_a_path):
            raise FileNotFoundError(f"{image_a_path}: No such file or directory")
        if not os.path.exists(image_b_path):
            raise FileNotFoundError(f"{image_b_path}: No such file or directory")
        if not os.path.exists(aoi_path):
            raise FileNotFoundError(f"{aoi_path}: No such file or directory")

        with open(aoi_path, 'r') as f:
            aoi_geojson = json.load(f)
            logging.info("Successfully loaded AOI GeoJSON.")
        
        output_a, output_b = clip_and_align_images(image_a_path, image_b_path, aoi_geojson, outputs_dir)

        # Post success status
        post_status_update(
            args.job_id,
            "completed",
            args.callback_url,
            output_a=output_a,
            output_b=output_b
        )
        
        logging.info(f"Worker for job {args.job_id} completed successfully.")

    except Exception as e:
        # Post failure status
        logging.error(f"Worker for job {args.job_id} failed with error: {e}")
        post_status_update(
            args.job_id,
            "failed",
            args.callback_url,
            error=str(e)
        )
        
if __name__ == "__main__":
    main()