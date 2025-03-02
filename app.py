from flask import Flask, render_template, request, jsonify
import requests
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Get API key from environment variable
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
if not GOOGLE_MAPS_API_KEY:
    raise ValueError("Google Maps API key not found. Make sure the GOOGLE_MAPS_API_KEY is set in your .env file.")

@app.route("/")
def index():
    # Pass the API key to the template
    return render_template("index.html", api_key=GOOGLE_MAPS_API_KEY)

@app.route("/search", methods=["GET"])
def search():
    latitude = request.args.get("lat")
    longitude = request.args.get("lng")
    place_type = request.args.get("type", "hospital")  # Default to hospitals
    radius = request.args.get("radius", "5000")  # Default to 5 km

    places_url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{latitude},{longitude}",
        "radius": radius,
        "key": GOOGLE_MAPS_API_KEY
    }
    
    # Special handling for college search
    if place_type == "college":
        # Use 'university' type which is a valid Google Places API type
        params["type"] = "university"
        # Add keyword to improve search results
        params["keyword"] = "college|university"
    else:
        params["type"] = place_type

    response = requests.get(places_url, params=params)
    places_data = response.json()
    
    # If we're searching for colleges and got no results, try with 'school' type as fallback
    if place_type == "college" and (not places_data.get("results") or len(places_data.get("results", [])) == 0):
        params["type"] = "school"
        params["keyword"] = "college|university|higher education"
        response = requests.get(places_url, params=params)
        places_data = response.json()

    return jsonify(places_data)

@app.route("/distance", methods=["GET"])
def calculate_distance():
    origin_lat = request.args.get("origin_lat")
    origin_lng = request.args.get("origin_lng")
    destinations = request.args.get("destinations")  # Format: lat,lng|lat,lng|...

    distance_url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins": f"{origin_lat},{origin_lng}",
        "destinations": destinations,
        "key": GOOGLE_MAPS_API_KEY
    }

    response = requests.get(distance_url, params=params)
    distance_data = response.json()

    return jsonify(distance_data)

if __name__ == "__main__":
    app.run(debug=True)
