import math
from typing import Dict, Any

class GeofencingService:
    """
    Handles geographical awareness for hospital check-ins.
    """
    
    HOSPITAL_COORDS = (12.9716, 77.5946) # Example coords (Bangalore)
    CHECKIN_RADIUS_KM = 1.0
    
    @staticmethod
    def calculate_distance(lat1, lon1, lat2, lon2):
        """
        Haversine formula to calculate the distance between two points.
        """
        R = 6371 # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    @staticmethod
    def is_near_hospital(lat: float, lon: float) -> bool:
        distance = GeofencingService.calculate_distance(
            lat, lon, 
            GeofencingService.HOSPITAL_COORDS[0], 
            GeofencingService.HOSPITAL_COORDS[1]
        )
        return distance <= GeofencingService.CHECKIN_RADIUS_KM
