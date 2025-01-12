import React, { useEffect, useRef, useState } from "react";
import { loadModules } from 'esri-loader';

// Define a type for Isochrone data
interface Isochrone {
  id: number;
  geojson: string;
}

interface IsochroneMapProps {
  address: string;
  walkTime: number;
}

const IsochroneMap: React.FC<IsochroneMapProps> = ({ address, walkTime }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [isochrones, setIsochrones] = useState<Isochrone[]>([]); 
   // Track error message state
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMap = async () => {
      try {
        const [WebMap, MapView, GraphicsLayer, Graphic, Color] = await loadModules([
          "esri/WebMap",
          "esri/views/MapView",
          "esri/layers/GraphicsLayer",
          "esri/Graphic",
          "esri/Color"
        ]);

        const map = new WebMap({
        // Webmap id from esri
          portalItem: { id: "esri-webmap-id" }, 
        });

        const view = new MapView({
          container: mapRef.current!,
          map: map,
        });

        const graphicsLayer = new GraphicsLayer();
        map.add(graphicsLayer);

        // Function to fetch isochrones from backend
        const fetchIsochrones = async (address: string, walkTime: number) => {
          try {
            const response = await fetch(
              `http://localhost:8000/isochrone/?address=${address}&walk_time=${walkTime}`
            );
            if (!response.ok) {
              throw new Error(`Failed to fetch isochrones: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.isochnone) {
              // Update the state with the fetched isochrones
              const geojson = data.isochnone;
              setIsochrones((prevIsochrones) => [
                ...prevIsochrones,
                { id: prevIsochrones.length + 1, geojson },
              ]);
              // Render the new isochrone on the map
              renderIsochrone(geojson); 
            } else {
              throw new Error('No isochrone data found');
            }
          } catch (err) {
            setError(`Error fetching isochrones: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        };

        const renderIsochrone = async (geojson: string) => {
          try {
            const [Graphic] = await loadModules(["esri/Graphic"]);
            const jsonData = JSON.parse(geojson);
            const isochroneGraphic = new Graphic({
              geometry: jsonData,
              symbol: {
                type: "simple-fill",
                color: new Color([0, 0, 255, 0.3]), 
                outline: {
                  color: new Color([0, 0, 255]),
                  width: 2,
                },
              },
            });
            graphicsLayer.add(isochroneGraphic);
          } catch (err) {
            setError(`Error rendering isochrone: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        };

        // Initial call to fetchIsochrones with address and walkTime from props
        fetchIsochrones(address, walkTime);

      } catch (err) {
        setError(`Failed to load map: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };
//loads the actual visual map
    loadMap();
// Reload map if address or walkTime changes
  }, [address, walkTime]); 

  return (
    <div>
      <div ref={mapRef} style={{ width: "100%", height: "500px" }}></div>

      {/* Error display */}
      {error && <div style={{ color: 'red', marginTop: '10px' }}><strong>Error:</strong> {error}</div>}

      {/* Display the list of fetched isochrones */}
      <div>
        <h3>Fetched Isochrones:</h3>
        <ul>
          {isochrones.map((isochrone) => (
            <li key={isochrone.id}>
              <span>Isochrone ID: {isochrone.id}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default IsochroneMap;
