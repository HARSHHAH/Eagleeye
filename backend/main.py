from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
import osmnx as ox
import networkx as nx
import geopandas as gpd
from shapely.geometry import Polygon
from geopy.geocoders import Nominatim
from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base


app = FastAPI()

# Middleware for CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# PostgreSQL Connection using PostGIS
DATABASE_URL = "postgresql+asyncpg://user:password@localhost/walkability_db"
engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

# WalkabilityIsochrone Table
class WalkabilityIsochrone(Base):
    __tablename__ = "walkability_isochrones"
    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    walk_time = Column(Integer, nullable=False)
    # Let's us store GeoJSON representation
    geojson = Column(String, nullable=False)  

# Creation of DB Tables
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# Load Toronto's Walkable Street Network
G = ox.graph_from_place("Toronto, Canada", network_type="walk")

# Address Geocoding Function
def geocode_address(address: str):
    geolocator = Nominatim(user_agent="walkability-app")
    location = geolocator.geocode(address)
    if location:
        return location.latitude, location.longitude
    return None, None

# Compute Isochrone
def get_isochrone(lat, lon, walk_time=10, speed_kph=4.8):
    speed_mps = (speed_kph * 1000) / 3600
    # Convert minutes to meters
    travel_distance = speed_mps * walk_time * 60  

    # Find the nearest node in the road network
    orig_node = ox.distance.nearest_nodes(G, lon, lat)

    # Compute shortest paths and extract reachable nodes
    subgraph = nx.ego_graph(G, orig_node, radius=travel_distance, distance="length")

    # Convert nodes to a polygon
    nodes, _ = ox.graph_to_gdfs(subgraph)
    isochrone_polygon = nodes.unary_union.convex_hull

    # Convert to GeoJSON
    geojson = gpd.GeoSeries([isochrone_polygon]).to_json()
    return geojson

# Get Isochrone for Address
@app.get("/isochrone/")
async def isochrone(address: str = Query(...), walk_time: int = Query(10)):
    lat, lon = geocode_address(address)
    if not lat or not lon:
        return {"error": "Invalid address"}

    geojson = get_isochrone(lat, lon, walk_time)
    return {"isochrone": geojson}

# Store Isochrone in DB
@app.post("/isochrone/save")
async def save_isochrone(address: str = Query(...), walk_time: int = Query(10)):
    async with SessionLocal() as session:
        lat, lon = geocode_address(address)
        if not lat or not lon:
            return {"error": "Invalid address"}

        geojson = get_isochrone(lat, lon, walk_time)

        new_isochrone = WalkabilityIsochrone(
            latitude=lat, longitude=lon, walk_time=walk_time, geojson=geojson
        )
        session.add(new_isochrone)
        await session.commit()
        return {"message": "Isochrone saved", "id": new_isochrone.id}

# Get Isochrones from DB
@app.get("/isochrones/")
async def get_isochrones():
    async with SessionLocal() as session:
        result = await session.execute("SELECT id, latitude, longitude, walk_time, geojson FROM walkability_isochrones")
        return {"isochrones": result.fetchall()}

# DB Initialization
import asyncio
asyncio.create_task(init_db())
