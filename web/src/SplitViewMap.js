import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMapEvents, useMap } from 'react-leaflet';
import GeoRasterLayer from 'georaster-layer-for-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const MapPane = React.forwardRef(({
  georaster,
  className,
  featureGroupRef,
  onDrawCreated,
  syncState,
  setSyncState,
  isSyncingRef,
  resetAoi
}, ref) => {
  const map = useMap();

  useMapEvents({
    moveend: () => {
      if (isSyncingRef.current) {
        return;
      }
      setSyncState({
        center: map.getCenter(),
        zoom: map.getZoom()
      });
    },
  });

  useEffect(() => {
    if (map.getCenter().equals(syncState.center) && map.getZoom() === syncState.zoom) {
      return;
    }
    
    isSyncingRef.current = true;
    map.setView(syncState.center, syncState.zoom, { animate: false });
    
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 100);
  }, [map, syncState, isSyncingRef]);

  useEffect(() => {
    let layer = null;
    if (georaster) {
      const pixelValuesToColorFn = (values) => {
        if (values.length >= 3) {
          const [r, g, b] = values;
          return `rgb(${r}, ${g}, ${b})`;
        }
        const val = values[0];
        if (val === 0) {
          return null; 
        }
        return `rgb(${val}, ${val}, ${val})`;
      };

      const options = {
        opacity: 0.8,
        resolution: 256,
        resampleMethod: 'bilinear',
        pixelValuesToColorFn,
      };
      
      layer = new GeoRasterLayer({ georaster, ...options });
      layer.addTo(map);
      map.fitBounds(layer.getBounds());
    }
    return () => {
      if (layer) {
        map.removeLayer(layer);
      }
    };
  }, [georaster, map]);

  useEffect(() => {
    if (resetAoi && featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
  }, [resetAoi, featureGroupRef]);

  const onCreated = (e) => {
    const { layer } = e;
    if (layer._bounds) {
      onDrawCreated({ layer, featureGroupRef });
    }
  };

  return (
    <>
      <TileLayer url={TILE_LAYER_URL} attribution="&copy; OpenStreetMap contributors" />
      <FeatureGroup ref={featureGroupRef}>
        <EditControl
          position="topright"
          onCreated={onCreated}
          draw={{
            rectangle: true,
            polyline: false,
            polygon: false,
            circle: false,
            marker: false,
            circlemarker: false,
          }}
          edit={{
            edit: false,
            remove: false,
          }}
        />
      </FeatureGroup>
    </>
  );
});

const SplitViewMap = ({ imageA, imageB, onAoiCreated, resetAoi, showProcessed, processedImages }) => {
  const featureGroupARef = useRef(null);
  const featureGroupBRef = useRef(null);
  const isSyncingRef = useRef(false);

  const [syncStateA, setSyncStateA] = useState({ center: [0, 0], zoom: 2 });
  const [syncStateB, setSyncStateB] = useState({ center: [0, 0], zoom: 2 });

  const [activeImageA, setActiveImageA] = useState(null);
  const [activeImageB, setActiveImageB] = useState(null);

  useEffect(() => {
    if (showProcessed && processedImages && processedImages.A && processedImages.B) {
      setActiveImageA(processedImages.A);
      setActiveImageB(processedImages.B);
    } else {
      setActiveImageA(imageA);
      setActiveImageB(imageB);
    }
  }, [showProcessed, processedImages, imageA, imageB]);

  const syncDrawings = useCallback(({ layer }) => {
    const bounds = layer.getBounds();
    onAoiCreated(bounds);

    if (featureGroupARef.current) featureGroupARef.current.clearLayers();
    if (featureGroupBRef.current) featureGroupBRef.current.clearLayers();

    L.rectangle(bounds).addTo(featureGroupARef.current);
    L.rectangle(bounds).addTo(featureGroupBRef.current);
  }, [onAoiCreated]);

  useEffect(() => {
    if (resetAoi) {
      if (featureGroupARef.current) {
        featureGroupARef.current.clearLayers();
      }
      if (featureGroupBRef.current) {
        featureGroupBRef.current.clearLayers();
      }
    }
  }, [resetAoi]);

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      <div style={{ flex: 1 }}>
        <MapContainer
          center={[0, 0]}
          zoom={2}
          scrollWheelZoom={true}
          style={{ height: '100%' }}
        >
          <MapPane
            georaster={activeImageA?.georaster}
            featureGroupRef={featureGroupARef}
            onDrawCreated={syncDrawings}
            syncState={syncStateA}
            setSyncState={setSyncStateB}
            isSyncingRef={isSyncingRef}
            resetAoi={resetAoi}
          />
        </MapContainer>
      </div>
      <div style={{ flex: 1 }}>
        <MapContainer
          center={[0, 0]}
          zoom={2}
          scrollWheelZoom={true}
          style={{ height: '100%' }}
        >
          <MapPane
            georaster={activeImageB?.georaster}
            featureGroupRef={featureGroupBRef}
            onDrawCreated={syncDrawings}
            syncState={syncStateB}
            setSyncState={setSyncStateA}
            isSyncingRef={isSyncingRef}
            resetAoi={resetAoi}
          />
        </MapContainer>
      </div>
    </div>
  );
};

export default SplitViewMap;