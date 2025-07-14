let map;
let routeControl;

function initMap() {
    map = L.map('map').setView([15.3062, 120.8573], 13); // Default center

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
}

function findRoute() {
    const destination = document.getElementById('destinationInput').value.trim();
    const useLocation = document.getElementById('useMyLocation').checked;
    const startAddress = document.getElementById('startInput').value.trim();

    if (!destination) {
        alert("Please enter a destination.");
        return;
    }

    if (routeControl) {
        map.removeControl(routeControl);
    }

    if (useLocation) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const startCoords = [position.coords.latitude, position.coords.longitude];
                    geocodeDestinationAndRoute(startCoords, destination);
                },
                () => alert("Could not get your location. Try entering your start address manually.")
            );
        } else {
            alert("Geolocation not supported. Enter your start address manually.");
        }
    } else {
        if (!startAddress) {
            alert("Please enter a starting address.");
            return;
        }

        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startAddress)}&limit=1`)
            .then(res => res.json())
            .then(data => {
                if (!data.length) {
                    alert("Starting address not found.");
                    return;
                }
                const startCoords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                geocodeDestinationAndRoute(startCoords, destination);
            });
    }
}

function geocodeDestinationAndRoute(startCoords, destinationAddress) {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationAddress)}&limit=1`)
        .then(res => res.json())
        .then(data => {
            if (!data.length) {
                alert("Destination address not found.");
                return;
            }
            const endCoords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];

            L.marker(startCoords).addTo(map).bindPopup("Start").openPopup();
            L.marker(endCoords).addTo(map).bindPopup("Destination").openPopup();
            map.setView(startCoords, 14);

            routeControl = L.Routing.control({
                waypoints: [L.latLng(startCoords), L.latLng(endCoords)],
                router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
                createMarker: () => null
            }).addTo(map);

            routeControl.on('routesfound', function (e) {
                const distance = e.routes[0].summary.totalDistance / 1000;
                document.getElementById('distance').value = distance.toFixed(2);
                document.getElementById('distanceResult').textContent = `Calculated Distance: ${distance.toFixed(2)} km`;
            });
        });
}

function toggleBuyerFields() {
    const show = document.getElementById('buyerService').checked;
    document.getElementById('buyerFields').style.display = show ? 'block' : 'none';
}

function calculatePrice() {
    const distance = parseFloat(document.getElementById('distance').value);
    const hasBuyer = document.getElementById('buyerService').checked;
    const hours = hasBuyer ? parseFloat(document.getElementById('hours').value) : 0;
    const weight = hasBuyer ? parseFloat(document.getElementById('weight').value) : 0;

    const basePrice = 60;
    const includedKm = 4;
    const perKm = 15;
    const buyerRate = 60;
    const maxWeight = 7;
    const extraKgRate = 10;

    let extraKm = Math.max(0, distance - includedKm);
    let deliveryCost = basePrice + extraKm * perKm;
    let buyerCost = hasBuyer ? hours * buyerRate : 0;
    let extraWeightCost = 0;

    if (hasBuyer && weight > maxWeight) {
        extraWeightCost = (weight - maxWeight) * extraKgRate;
        document.getElementById('weightWarning').style.display = 'block';
    } else {
        document.getElementById('weightWarning').style.display = 'none';
    }

    const total = deliveryCost + buyerCost + extraWeightCost;

    document.getElementById('deliveryCost').innerHTML = `
        <p><strong>Delivery Cost:</strong></p>
        <p>Base Price: ₱${basePrice}</p>
        ${extraKm > 0 ? `<p>Extra ${extraKm.toFixed(2)} km × ₱${perKm} = ₱${(extraKm * perKm).toFixed(2)}</p>` : ''}
    `;

    if (hasBuyer) {
        document.getElementById('buyerServiceDetails').innerHTML = `
            <p><strong>Buyer Service:</strong></p>
            <p>${hours} hour(s) × ₱${buyerRate} = ₱${buyerCost.toFixed(2)}</p>
            <p>Weight: ${weight} kg</p>
        `;
    } else {
        document.getElementById('buyerServiceDetails').innerHTML = '';
    }

    document.getElementById('totalPrice').innerHTML = `Total Price: ₱${total.toFixed(2)}`;
    document.getElementById('result').style.display = 'block';
}

window.onload = initMap;
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        console.log('Service Worker registered:', reg);
      })
      .catch(err => {
        console.error('Service Worker registration failed:', err);
      });
  });
}
