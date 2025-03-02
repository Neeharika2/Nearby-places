let map;
let userMarker;
let placesService;
let geocoder;
let currentLocation;
// Define colors for markers
const markerColors = ['#EA4335', '#FBBC05', '#34A853', '#FF6D01', '#46BDC6', '#7B0099']; // Red, Yellow, Green, Orange, Teal, Purple
const userLocationColor = '#4285F4'; // Google blue color

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 17.3850, lng: 78.4867 }, // Hyderabad, Telangana, India
        zoom: 12,
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                let userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                map.setCenter(userLocation);
                currentLocation = userLocation;

                userMarker = new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: "Your Location",
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: userLocationColor,
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                        scale: 10
                    }
                });
            },
            () => alert("Geolocation failed")
        );
    }

    placesService = new google.maps.places.PlacesService(map);
    geocoder = new google.maps.Geocoder();
}

function searchPlaces() {
    let placeType = document.getElementById("place-type").value;
    let searchBox = document.getElementById("search-box").value;

    if (searchBox) {  // If a location is entered
        geocoder.geocode({ 'address': searchBox }, function (results, status) {
            if (status === 'OK' && results[0]) {
                let location = results[0].geometry.location;
                map.setCenter(location);

                if (userMarker) {
                    userMarker.setMap(null); // Remove previous user marker
                }

                userMarker = new google.maps.Marker({
                    position: location,
                    map: map,
                    title: "Search Location",
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: userLocationColor,
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                        scale: 10
                    }
                });

                // Update current location
                currentLocation = {
                    lat: location.lat(),
                    lng: location.lng()
                };

                fetchNearbyPlaces(currentLocation.lat, currentLocation.lng, placeType);
            } else {
                alert('Geocode was not successful for the following reason: ' + status);
            }
        });
    } else if (navigator.geolocation) { // If no location, use geolocation
        navigator.geolocation.getCurrentPosition((position) => {
            let lat = position.coords.latitude;
            let lng = position.coords.longitude;
            
            currentLocation = { lat, lng };
            fetchNearbyPlaces(lat, lng, placeType);
        });
    }
}

function fetchNearbyPlaces(lat, lng, placeType) {
    fetch(`/search?lat=${lat}&lng=${lng}&type=${placeType}`)
        .then(response => response.json())
        .then(data => {
            const places = data.results;
            if (places.length > 0) {
                calculateDistances(places);
            } else {
                displayPlaces(places); // No places found
            }
        })
        .catch(error => console.error("Error fetching places:", error));
}

function calculateDistances(places) {
    // Prepare destinations string for distance matrix API
    const destinations = places.map(place => {
        const location = place.geometry.location;
        return `${location.lat},${location.lng}`;
    }).join('|');

    // Call distance matrix API
    fetch(`/distance?origin_lat=${currentLocation.lat}&origin_lng=${currentLocation.lng}&destinations=${destinations}`)
        .then(response => response.json())
        .then(data => {
            // Add distance info to places
            if (data.rows && data.rows[0] && data.rows[0].elements) {
                const distanceElements = data.rows[0].elements;
                places.forEach((place, index) => {
                    if (distanceElements[index].status === "OK") {
                        place.distanceText = distanceElements[index].distance.text;
                        place.durationText = distanceElements[index].duration.text;
                    }
                });
            }
            displayPlaces(places);
        })
        .catch(error => {
            console.error("Error calculating distances:", error);
            displayPlaces(places); // Display places without distances if there's an error
        });
}

function displayPlaces(places) {
    let placesList = document.getElementById("places-list");
    placesList.innerHTML = "";

    if (places.length === 0) {
        placesList.innerHTML = "<div class='no-places'>No places found nearby</div>";
        return;
    }

    // Clear existing markers except user marker
    clearPlaceMarkers();
    
    // Array to store the place markers
    let placeMarkers = [];

    places.forEach((place, index) => {
        let placeItem = document.createElement("div");
        placeItem.classList.add("place-item");

        let name = place.name || "Unknown";
        let address = place.vicinity || "Address not available";
        let rating = place.rating ? `⭐ ${place.rating.toFixed(1)}` : "No ratings";
        
        // Get marker color for this place
        const markerColor = markerColors[index % markerColors.length];
        
        // Add distance information if available
        let distanceInfo = "";
        if (place.distanceText) {
            distanceInfo = `<div class="distance-info">
                <span>${place.distanceText}</span>
                <span>${place.durationText}</span>
            </div>`;
        }

        // Add color indicator matching the marker color
        placeItem.innerHTML = `
            <div class="place-header">
                <div class="marker-color-indicator" style="background-color: ${markerColor}"></div>
                <strong>${name}</strong>
            </div>
            <div class="address">${address}</div>
            <div class="rating">${rating}</div>
            ${distanceInfo}
        `;

        placesList.appendChild(placeItem);

        // Create marker with matching color
        let marker = new google.maps.Marker({
            position: place.geometry.location,
            map: map,
            title: name,
            animation: google.maps.Animation.DROP,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: markerColor,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 1,
                scale: 8
            }
        });
        
        // Add click event to markers
        marker.addListener('click', () => {
            map.setCenter(marker.getPosition());
            map.setZoom(15);
            
            // Highlight the corresponding item in the list
            document.querySelectorAll('.place-item').forEach(item => {
                item.classList.remove('highlight');
            });
            placeItem.classList.add('highlight');
            
            // Make sure the item is visible in the scrollable container
            placeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        
        // Add click event to list item
        placeItem.addEventListener('click', () => {
            map.setCenter(marker.getPosition());
            map.setZoom(15);
        });
        
        // Store marker reference
        placeMarkers.push(marker);
    });
    
    // Ensure the places list has focus after search
    document.querySelector('.places-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Store markers in a global variable to clear them later
    window.placeMarkers = placeMarkers;
}

// Function to clear all place markers
function clearPlaceMarkers() {
    if (window.placeMarkers) {
        window.placeMarkers.forEach(marker => marker.setMap(null));
    }
    window.placeMarkers = [];
}

window.onload = initMap;

document.getElementById("search-btn").addEventListener("click", searchPlaces);