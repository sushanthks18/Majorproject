"""
Simplified satellite data fetching and NDVI analysis
For college project - uses mock data for demo purposes
In production, integrate with actual Planetary Computer API
"""
import sys
import json
from datetime import datetime, timedelta
import random

def fetch_satellite_data(field_bounds, days_back=30):
    """
    Simulate fetching Sentinel-2 data
    In production: Use pystac_client and planetary_computer
    """
    # Mock response simulating satellite data availability
    mock_date = datetime.now() - timedelta(days=random.randint(1, days_back))
    
    return {
        "success": True,
        "satellite": "Sentinel-2",
        "acquisition_date": mock_date.isoformat(),
        "cloud_cover": random.uniform(5, 20),
        "resolution": 10,
        "message": "Satellite data simulated for demo"
    }

def calculate_ndvi(field_id, field_bounds):
    """
    Simulate NDVI calculation and zone detection
    In production: Use rasterio, numpy for actual band processing
    """
    # Mock NDVI values
    mean_ndvi = random.uniform(0.5, 0.75)
    health_score = int((mean_ndvi / 0.8) * 100)
    
    # Get field center coordinates
    center_lat = field_bounds.get("centerLat", 13.34)
    center_lng = field_bounds.get("centerLng", 77.10)
    
    # Generate mock zones with proper GeoJSON boundaries
    zones = []
    sensor_placements = []
    
    # Zone A - Critical (northwest corner)
    zone_a_lat = center_lat + 0.003
    zone_a_lng = center_lng - 0.003
    zones.append({
        "zoneName": "Zone A - Critical",
        "stressLevel": "critical",
        "boundary": {
            "type": "Polygon",
            "coordinates": [[
                [zone_a_lng - 0.002, zone_a_lat - 0.002],
                [zone_a_lng + 0.002, zone_a_lat - 0.002],
                [zone_a_lng + 0.002, zone_a_lat + 0.002],
                [zone_a_lng - 0.002, zone_a_lat + 0.002],
                [zone_a_lng - 0.002, zone_a_lat - 0.002]
            ]]
        },
        "areaHectares": round(random.uniform(0.3, 0.6), 2),
        "meanNdvi": round(mean_ndvi - 0.2, 3),
        "color": "#ef4444"
    })
    sensor_placements.append({
        "placementNumber": 1,
        "zoneId": "zone-a",
        "priority": "high",
        "gpsLat": zone_a_lat,
        "gpsLon": zone_a_lng,
        "reason": "Critical stress zone - urgent monitoring required",
        "googleMapsLink": f"https://www.google.com/maps?q={zone_a_lat},{zone_a_lng}"
    })
    
    # Zone B - Moderate (center)
    zones.append({
        "zoneName": "Zone B - Moderate",
        "stressLevel": "moderate",
        "boundary": {
            "type": "Polygon",
            "coordinates": [[
                [center_lng - 0.0025, center_lat - 0.0025],
                [center_lng + 0.0025, center_lat - 0.0025],
                [center_lng + 0.0025, center_lat + 0.0025],
                [center_lng - 0.0025, center_lat + 0.0025],
                [center_lng - 0.0025, center_lat - 0.0025]
            ]]
        },
        "areaHectares": round(random.uniform(0.6, 1.0), 2),
        "meanNdvi": round(mean_ndvi, 3),
        "color": "#eab308"
    })
    sensor_placements.append({
        "placementNumber": 2,
        "zoneId": "zone-b",
        "priority": "medium",
        "gpsLat": center_lat,
        "gpsLon": center_lng,
        "reason": "Moderate stress - regular monitoring needed",
        "googleMapsLink": f"https://www.google.com/maps?q={center_lat},{center_lng}"
    })
    
    # Zone C - Healthy (southeast)
    zone_c_lat = center_lat - 0.003
    zone_c_lng = center_lng + 0.003
    zones.append({
        "zoneName": "Zone C - Healthy",
        "stressLevel": "healthy",
        "boundary": {
            "type": "Polygon",
            "coordinates": [[
                [zone_c_lng - 0.002, zone_c_lat - 0.002],
                [zone_c_lng + 0.002, zone_c_lat - 0.002],
                [zone_c_lng + 0.002, zone_c_lat + 0.002],
                [zone_c_lng - 0.002, zone_c_lat + 0.002],
                [zone_c_lng - 0.002, zone_c_lat - 0.002]
            ]]
        },
        "areaHectares": round(random.uniform(0.8, 1.5), 2),
        "meanNdvi": round(mean_ndvi + 0.15, 3),
        "color": "#22c55e"
    })
    sensor_placements.append({
        "placementNumber": 3,
        "zoneId": "zone-c",
        "priority": "low",
        "gpsLat": zone_c_lat,
        "gpsLon": zone_c_lng,
        "reason": "Healthy zone - baseline monitoring",
        "googleMapsLink": f"https://www.google.com/maps?q={zone_c_lat},{zone_c_lng}"
    })
    
    return {
        "success": True,
        "satellite": "Sentinel-2",
        "acquisition_date": datetime.now().isoformat(),
        "cloud_cover": round(random.uniform(5, 15), 1),
        "resolution": 10,
        "mean_ndvi": round(mean_ndvi, 3),
        "health_score": health_score,
        "zones": zones,
        "sensor_placements": sensor_placements,
        "total_sensors_needed": len(sensor_placements),
        "message": "NDVI analysis completed (demo data)"
    }

if __name__ == "__main__":
    try:
        # Read command from command line
        command = sys.argv[1] if len(sys.argv) > 1 else None
        
        # Read JSON data from stdin
        data = json.loads(sys.stdin.read())
        
        if command == "fetch":
            result = fetch_satellite_data(data.get("bounds"), data.get("daysBack", 30))
        elif command == "analyze":
            result = calculate_ndvi(data.get("fieldId"), data.get("bounds"))
        else:
            result = {"success": False, "error": "Unknown command"}
        
        print(json.dumps(result))
    except Exception as e:
        error_result = {"success": False, "error": str(e)}
        print(json.dumps(error_result))
