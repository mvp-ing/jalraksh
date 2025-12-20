import os
import logging
import json
import asyncio
import time
from typing import List, Dict, Any, Optional

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# import vertexai
from google.genai import types
from google.adk.agents.llm_agent import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

# Reuse the robust Earth Engine logic we built
import ee
import requests
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==============================================================================
# EARTH ENGINE TOOL LOGIC (Embedded directly for portability)
# ==============================================================================
class Config:
    MAX_CLOUD_PERCENTAGE = 20 
    TIME_STEP_DAYS = 15
    # Save images to frontend public folder for easy serving
    # Path relative to project root: jalrakshak/src/frontend/public/satellite
    PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    BASE_OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'jalrakshak', 'src', 'frontend', 'public', 'satellite')
    MAX_WORKERS = 32

from google.oauth2 import service_account

class GEEAuth:
    @staticmethod
    def initialize(key_path=None):
        """
        Initialize Google Earth Engine authentication.
        
        Priority for key path:
        1. Explicit key_path argument
        2. GEE_SERVICE_KEY_PATH environment variable
        3. Default locations in project root
        """
        try:
            # Determine key path
            if key_path is None:
                key_path = os.getenv('GEE_SERVICE_KEY_PATH')
            
            if key_path is None:
                # Try default locations relative to project root
                project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                default_locations = [
                    os.path.join(project_root, 'gee-service-key.json'),
                    os.path.join(project_root, 'credentials', 'gee-service-key.json'),
                    os.path.join(project_root, 'backend', 'gee-service-key.json'),
                ]
                for loc in default_locations:
                    if os.path.exists(loc):
                        key_path = loc
                        break
            
            # Get project ID from environment or default
            project_id = os.getenv('GEE_PROJECT_ID', 'gdg-hack-481417')
            
            if key_path and os.path.exists(key_path):
                credentials = service_account.Credentials.from_service_account_file(
                    key_path,
                    scopes=['https://www.googleapis.com/auth/earthengine']
                )
                ee.Initialize(
                    credentials=credentials,
                    project=project_id
                )
                logger.info(f"✅ GEE Auth: Service Account (Project: {project_id})")
                return True
            else:
                # Try default authentication (user's gcloud credentials)
                logger.warning(f"⚠️ Service key not found, trying default authentication...")
                ee.Initialize(project=project_id)
                logger.info(f"✅ GEE Auth: Default credentials (Project: {project_id})")
                return True
        except Exception as e:
            logger.error(f"❌ GEE Auth Failed: {e}")
            return False

class WaterPhysics:
    @staticmethod
    def get_river_mask(image, min_pixels=500):
        ndwi = image.normalizedDifference(['B3', 'B8'])
        water_initial = ndwi.gt(0.0)
        # Morphological opening to remove noise
        river_mask = water_initial.focal_min(1.5).focal_max(1.5)
        return river_mask

    @staticmethod
    def simulate_pollution_on_full_image(image, mask, intensity=0.9):
        # Muddy simulation logic
        muddy_b4 = image.select('B4').multiply(1.0 + (intensity * 0.8)) # Red++
        muddy_b3 = image.select('B3').multiply(1.0 + (intensity * 0.4)) # Green+
        muddy_b2 = image.select('B2').multiply(1.0 - (intensity * 0.2)) # Blue--
        
        binary_mask = mask.unmask(0).gt(0)
        new_b4 = image.select('B4').where(binary_mask, muddy_b4)
        new_b3 = image.select('B3').where(binary_mask, muddy_b3)
        new_b2 = image.select('B2').where(binary_mask, muddy_b2)
        
        return image.addBands(new_b4, ['B4'], True).addBands(new_b3, ['B3'], True).addBands(new_b2, ['B2'], True)

class DataFetcher:
    @staticmethod
    def get_clean_composite(roi, start, end):
        def mask_clouds(img):
            qa = img.select('QA60')
            cloud_mask = qa.bitwiseAnd(1<<10).eq(0).And(qa.bitwiseAnd(1<<11).eq(0))
            return img.updateMask(cloud_mask).divide(10000)

        collection = (
            ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterDate(start, end)
            .filterBounds(roi)
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', Config.MAX_CLOUD_PERCENTAGE))
            .map(mask_clouds)
        )
        if collection.size().getInfo() == 0: return None
        return collection.median().clip(roi)

class Visualizer:
    @staticmethod
    def fetch_image(ee_image, roi, title=""):
        vis_params = {
            'min': 0.0, 'max': 0.3, 
            'bands': ['B4', 'B3', 'B2'], 
            'dimensions': 800,  # Reduced from 1024 for speed (Strategy 1)
            'region': roi, 
            'format': 'png'
        }
        try:
            url = ee_image.getThumbURL(vis_params)
            resp = requests.get(url, timeout=30) # Short timeout for parallel retries
            if resp.status_code == 200:
                img = Image.open(BytesIO(resp.content)).convert('RGBA')
                if title:
                    draw = ImageDraw.Draw(img)
                    try:
                        font = ImageFont.truetype("Arial.ttf", 30) # Smaller font
                    except:
                        font = ImageFont.load_default()
                    
                    # Date Only Annotation (Black Box)
                    draw.rectangle((10, 10, 200, 50), fill="black")
                    draw.text((20, 15), title, font=font, fill="white")
                return img
        except: pass
        return None

# ==============================================================================
# THE TOOL FUNCTION (Exposed to Agent)
# ==============================================================================
import pandas as pd

# Global Station Data Cache
# Use relative path: agents/satellite_agent.py -> ../data/Sensor Stream/Indian_water_data.csv
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATION_DATA_PATH = os.path.join(BASE_DIR, "data", "Sensor Stream", "Indian_water_data.csv")
_station_df = None

def get_station_coords(station_code: str):
    global _station_df
    if _station_df is None:
        try:
            _station_df = pd.read_csv(STATION_DATA_PATH)
            # Ensure STN code is string for robust matching
            _station_df['STN code'] = _station_df['STN code'].astype(str)
        except Exception as e:
            logger.error(f"Failed to load CSV: {e}")
            return None, None

    # Lookup
    row = _station_df[_station_df['STN code'] == str(station_code)]
    if row.empty:
        return None, None
    
    return row.iloc[0]['latitude'], row.iloc[0]['longitude']

# ==============================================================================
# THE TOOL FUNCTION (Exposed to Agent)
# ==============================================================================
def river_simulation_tool(station_code: str, year: int = 2023, simulate: bool = True) -> dict:
    """
    Generates a FULL YEAR timeline of river simulation images for a specific Station Code.
    
    Args:
        station_code (str): The unique station identifier (e.g., "4085").
        year (int): Year to analyze (default 2023).
        simulate (bool): If True, generates augmented pollution views. If False, only raw satellite.
        
    Returns:
        dict: Status and summary of generated timeline.
    """
    
    # 1. Resolve Coordinates
    lat, lon = get_station_coords(station_code)
    if lat is None or lon is None:
        return {"status": "error", "message": f"Station Code '{station_code}' not found in database."}

    logger.info(f"Tool called: river_simulation_tool({station_code}, simulate={simulate}) -> ({lat}, {lon})")
    
    if not GEEAuth.initialize():
        return {"status": "error", "message": "Failed to authenticate with Earth Engine."}

    # Setup output folder using STATION CODE
    output_dir = os.path.join(Config.BASE_OUTPUT_DIR, str(station_code))
    
    # Define required folders
    folders = ['original_raw']
    if simulate:
        folders.append('simulated_raw')
        
    for f in folders:
        os.makedirs(os.path.join(output_dir, f), exist_ok=True)
        
    # Region
    point = ee.Geometry.Point([lon, lat])
    roi = point.buffer(6000).bounds()
    
    # 1. Generate Intervals (Jan 1 to Dec 31)
    windows = []
    curr = datetime(year, 1, 1)
    end_year = datetime(year, 12, 31)
    
    while curr < end_year:
        w_end = min(curr + timedelta(days=Config.TIME_STEP_DAYS), end_year)
        windows.append({'start': curr.strftime('%Y-%m-%d'), 'end': w_end.strftime('%Y-%m-%d')})
        curr = w_end
        
    logger.info(f"Generated {len(windows)} time windows for processing.")

    # 2. Parallel Processing Function
    def process_window(idx, w):
        try:
            # Fetch Data
            raw_img = DataFetcher.get_clean_composite(roi, w['start'], w['end'])
            if raw_img is None: 
                return None
                
            # Physics & Simulation (Only if needed)
            img_sim_full = None
            if simulate:
                river_mask = WaterPhysics.get_river_mask(raw_img)
                img_sim_full = WaterPhysics.simulate_pollution_on_full_image(raw_img, river_mask, intensity=1.0)
            
            # Save
            label = w['start']

            # Helper to save
            def save_frame(img, subfolder, title):
                if img is None: return None
                vis = Visualizer.fetch_image(img, roi, title)
                if vis:
                    p = f"{output_dir}/{subfolder}/frame_{idx:03d}.png"
                    vis.save(p)
                    return p
                return None

            # Save Versions
            # Clean Labels: "2023-01-01" instead of "1. Raw (2023-01-01)"
            save_frame(raw_img, 'original_raw', label)
            
            if simulate and img_sim_full:
                save_frame(img_sim_full, 'simulated_raw', label)
            
            return f"{w['start']}"
        except Exception as e:
            logger.error(f"Error processing {w['start']}: {e}")
            return None

    # 3. Execute with ThreadPool
    successful_frames = 0
    with ThreadPoolExecutor(max_workers=Config.MAX_WORKERS) as executor:
        futures = {executor.submit(process_window, i, w): i for i, w in enumerate(windows)}
        for future in as_completed(futures):
            res = future.result()
            if res: 
                successful_frames += 1
                logger.info(f"✓ Processed Frame: {res}")
            
    return {
        "status": "success",
        "station_code": station_code,
        "output_dir": output_dir,
        "total_frames": successful_frames,
        "coords": {"lat": lat, "lon": lon},
        "mode": "Simulated" if simulate else "Raw Only",
        "message": f"Successfully generated {successful_frames}/{len(windows)} frames for station {station_code} ({year})."
    }

# ==============================================================================
# AGENT CLASS
# ==============================================================================
class SatelliteAgent:
    """Agent for analyzing satellite imagery, water quality, and simulating pollution scenarios."""

    def __init__(self, api_key: str = None, project_id: str = None, location: str = "us-central1"):
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        self.project_id = project_id
        self.location = location
        self.app_name = "satellite_agent"
        
        # Initialize Authentication Strategy
        if self.api_key:
            # OPTION 1: Gemini API (AI Studio)
            logger.info("Satellite Agent using Gemini API Key.")
            os.environ["GOOGLE_API_KEY"] = self.api_key
        else:
            logger.warning("No API Key or Project ID provided. Agent definitions might fail.")

        # Initialize ADK LlmAgent with our custom tool
        self.adk_agent = LlmAgent(
            model="gemini-2.0-flash",
            name="satellite_agent",
            instruction="""You are an expert Satellite Imagery & Hydrology AI Assistant. Your goal is to help users visualize river pollution scenarios using Earth Engine data.
            
            Process:
            1. Understand the user's location of interest (or helping them find coordinates).
            2. Call the 'river_simulation_tool' with the coordinates.
            3. Explain the generated images to the user, highlighting the difference between the 'Original' (Real) and 'Simulated' (High Turbidity) views.
            
            The simulation tool generates 4 types of images:
            - Original Raw: Real satellite view.
            - Simulated Raw: Augmented view showing what the river would look like with high pollution.
            - Original Masked: Isolated river view (black background).
            - Simulated Masked: Isolated polluted river view (ideal for analysis).
            """,
            tools=[river_simulation_tool]
        )
        logger.info("ADK LlmAgent initialized with River Simulation Tool.")

    async def process_user_request(self, user_id: str, prompt: str) -> Dict[str, Any]:
        """Processes a user request using the ADK runner."""
        
        session_service = InMemorySessionService()
        session_id = f"session_{user_id}_{int(time.time())}"
        
        await session_service.create_session(
            app_name=self.app_name,
            user_id=user_id,
            session_id=session_id
        )
        
        runner = Runner(
            agent=self.adk_agent,
            app_name=self.app_name,
            session_service=session_service
        )
        
        user_content = types.Content(role='user', parts=[types.Part(text=prompt)])
        
        response_text = ""
        
        try:
            async for event in runner.run_async(
                user_id=user_id,
                session_id=session_id,
                new_message=user_content
            ):
                if event.is_final_response() and event.content:
                    response_text = event.content.parts[0].text
                    
        except Exception as e:
            logger.error(f"Error running agent: {e}")
            return {"error": str(e)}
            
        return {
            "response": response_text
        }

if __name__ == "__main__":
    import asyncio
    
    async def main():
        # Example: Using API Key from env
        # os.environ["GOOGLE_API_KEY"] = "YOUR_KEY_HERE"
        
        agent = SatelliteAgent() # Auto-detects key
        
        print("\n--- User Request ---")
        prompt = "Can you simulate a high pollution event for the Ganga river near Varanasi (Lat: 25.3176, Lon: 83.0062)?"
        print(f"User: {prompt}\n")
        
        result = await agent.process_user_request("test_user", prompt)
        print(f"Agent: {result.get('response')}")

    asyncio.run(main())
