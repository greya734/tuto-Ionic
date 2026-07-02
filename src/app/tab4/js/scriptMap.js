var map = L.map('map', {
    center: [-22.2758, 166.4572],
    zoom: 13
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

// Stocker toutes les stations et leurs marqueurs
var allStations = [];
var allMarkers = [];

// Couches géolocalisation (réutilisables)
var userMarker = null;
var nearestLine = null;

// --- Calcul distance Haversine (en km) ---
function haversine(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
        * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Affiche les infos d'une station dans la barre latérale ---
function afficherStation(commune, distance) {
    var distTxt = distance !== undefined
        ? `<li>📍 Distance : <strong>${distance < 1 ? (distance * 1000).toFixed(0) + ' m' : distance.toFixed(2) + ' km'}</strong></li>`
        : '';
    document.getElementById('infos').innerHTML = `
        <h2>${commune.Nom}</h2>
        <p>Id : ${commune.CodeInsee}</p>
        <table>
            <thead>
               <tr>
                  <th>Nom</th>
                  <th>CodeInsee</th>
                  <th>Code Postal</th>
                  <th>Population</th>
                  <th>Superficie</th>
                  <th>Densité Population</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Province</th>
                </tr>
            </thead>
            <tbody>
               <tr>
                   <td>${commune.Nom}</td>
                   <td>${commune.CodeInsee}</td>
                   <td>${commune.CodePostal}</td>
                   <td>${commune.Population}</td>
                   <td>${commune.Superficie}</td>
                   <td>${commune.DensitéPopulation}</td>
                   <td>${commune.latitude}</td>
                   <td>${commune.longitude}</td>
                   <td>${commune.Province}</td>

                </tr>
            </tbody>
        </table>
    `;
    $('#barre_laterale').removeClass('fermee');
}

// --- Géolocalisation et borne la plus proche ---
function geoLocaliser() {
    var btn = document.getElementById('btn-geo');
    btn.textContent = '⏳';
    btn.disabled = true;

    if (!navigator.geolocation) {
        alert("La géolocalisation n'est pas supportée par votre navigateur.");
        btn.textContent = '📍';
        btn.disabled = false;
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (pos) {
            var userLat = pos.coords.latitude;
            var userLon = pos.coords.longitude;

            // Supprimer les anciennes couches
            if (userMarker) map.removeLayer(userMarker);
            if (nearestLine) map.removeLayer(nearestLine);

            // Marqueur utilisateur avec icône distincte
            var userIcon = L.divIcon({
                className: '',
                html: '<div class="user-dot"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            userMarker = L.marker([userLat, userLon], { icon: userIcon })
                .addTo(map)
                .bindPopup('<b>Vous êtes ici</b>')
                .openPopup();

            // Trouver la borne la plus proche parmi les marqueurs visibles
            var minDist = Infinity;
            var nearest = null;

            allStations.forEach(function (station, i) {
                // Ignorer les marqueurs masqués par la recherche
                if (!map.hasLayer(allMarkers[i])) return;

                var d = haversine(userLat, userLon,
                    station.geo_point_2d.lat,
                    station.geo_point_2d.lon);
                if (d < minDist) {
                    minDist = d;
                    nearest = station;
                }
            });

            if (!nearest) {
                alert("Aucune borne visible sur la carte.");
                btn.textContent = '📍';
                btn.disabled = false;
                return;
            }

            // Tracer une ligne entre l'utilisateur et la borne la plus proche
            nearestLine = L.polyline(
                [[userLat, userLon], [nearest.geo_point_2d.lat, nearest.geo_point_2d.lon]],
                { color: '#00e5ff', weight: 2, dashArray: '6 6', opacity: 0.8 }
            ).addTo(map);

            // Centrer la vue pour tout voir
            map.fitBounds(nearestLine.getBounds(), { padding: [60, 60] });

            // Afficher les infos dans la barre latérale
            afficherStation(nearest, minDist);

            btn.textContent = '📍';
            btn.disabled = false;
        },
        function (err) {
            alert("Impossible d'obtenir votre position : " + err.message);
            btn.textContent = '📍';
            btn.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

$.getJSON('js/placeholder.json', function (data) {
    console.log('Total :', data.total_count);

    $.each(data.results, function (index, station) {
        var marker = L.marker([station.geo_point_2d.lat, station.geo_point_2d.lon]).addTo(map);

        allStations.push(station);
        allMarkers.push(marker);

        marker.on('click', function () {
            afficherStation(station);
        });
    });

    // Fermer la barre latérale
    $('#btn-fermer').on('click', function () {
        $('#barre_laterale').addClass('fermee');
    });

    // Bouton géolocalisation
    $('#btn-geo').on('click', geoLocaliser);

    // Gestion de la recherche
    $('form').on('submit', function (e) {
        e.preventDefault();

        var critere = $('.option-critere').val();
        var valeur = $('.critere').val().trim().toLowerCase();

        allMarkers.forEach(function (marker, index) {
            var station = allStations[index];
            var champStation = String(station[critere] ?? '').toLowerCase();

            if (valeur === '' || champStation.includes(valeur)) {
                if (!map.hasLayer(marker)) marker.addTo(map);
            } else {
                if (map.hasLayer(marker)) map.removeLayer(marker);
            }
        });
    });

    // Réinitialiser si champ vidé
    $('.critere').on('input', function () {
        if ($(this).val().trim() === '') {
            allMarkers.forEach(function (marker) {
                if (!map.hasLayer(marker)) marker.addTo(map);
            });
        }
    });
});
