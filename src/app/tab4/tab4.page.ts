import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from '@ionic/angular/standalone';
import * as L from 'leaflet';

interface Commune {
  Nom: string;
  CodeInsee: number;
  CodePostal: number;
  Population: number;
  Superficie: string;
  DensitéPopulation: string;
  latitude: string;
  longitude: string;
  Province: string;
}

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent],
})
export class Tab4Page implements AfterViewInit, OnDestroy {
  private map!: L.Map;
  private allCommunes: Commune[] = [];
  private allMarkers: L.Marker[] = [];
  private userMarker: L.Marker | null = null;
  private nearestLine: L.Polyline | null = null;

  geoIcon = '📍';
  sidebarFermee = true;
  infosHtml = '';
  private critereActuel = 'Nom';
  private valeurActuelle = '';

  ngAfterViewInit(): void {
    this.initMap();
    this.chargerCommunes();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [-22.2758, 166.4572],
      zoom: 13,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    // Si la carte apparaît coupée/grise (tab non visible au chargement)
    setTimeout(() => this.map.invalidateSize(), 200);
  }

  private chargerCommunes(): void {
    fetch('assets/data/communes.json')
      .then((res) => res.json())
      .then((data: Commune[]) => {
        console.log('Total :', data.length);

        data.forEach((commune) => {
          const lat = parseFloat(commune.latitude);
          const lon = parseFloat(commune.longitude);
          const marker = L.marker([lat, lon]).addTo(this.map);

          this.allCommunes.push(commune);
          this.allMarkers.push(marker);

          marker.on('click', () => this.afficherCommune(commune));
        });
      })
      .catch((err) => console.error('Erreur chargement communes :', err));
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private afficherCommune(commune: Commune, distance?: number): void {
    const distTxt =
      distance !== undefined
        ? `<li>📍 Distance : <strong>${
            distance < 1 ? (distance * 1000).toFixed(0) + ' m' : distance.toFixed(2) + ' km'
          }</strong></li>`
        : '';

    this.infosHtml = `
      <h2>${commune.Nom}</h2>
      <p>Id : ${commune.CodeInsee}</p>
      ${distTxt}
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
    this.sidebarFermee = false;
  }

  fermerSidebar(): void {
    this.sidebarFermee = true;
  }

  geoLocaliser(): void {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    this.geoIcon = '⏳';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLon = pos.coords.longitude;

        if (this.userMarker) this.map.removeLayer(this.userMarker);
        if (this.nearestLine) this.map.removeLayer(this.nearestLine);

        const userIcon = L.divIcon({
          className: '',
          html: '<div class="user-dot"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        this.userMarker = L.marker([userLat, userLon], { icon: userIcon })
          .addTo(this.map)
          .bindPopup('<b>Vous êtes ici</b>')
          .openPopup();

        let minDist = Infinity;
        let nearest: Commune | null = null;

        this.allCommunes.forEach((commune, i) => {
          if (!this.map.hasLayer(this.allMarkers[i])) return;

          const d = this.haversine(
            userLat,
            userLon,
            parseFloat(commune.latitude),
            parseFloat(commune.longitude)
          );
          if (d < minDist) {
            minDist = d;
            nearest = commune;
          }
        });

        if (!nearest) {
          alert('Aucune commune visible sur la carte.');
          this.geoIcon = '📍';
          return;
        }

        this.nearestLine = L.polyline(
          [
            [userLat, userLon],
            [
              parseFloat((nearest as Commune).latitude),
              parseFloat((nearest as Commune).longitude),
            ],
          ],
          { color: '#00e5ff', weight: 2, dashArray: '6 6', opacity: 0.8 }
        ).addTo(this.map);

        this.map.fitBounds(this.nearestLine.getBounds(), { padding: [60, 60] });
        this.afficherCommune(nearest, minDist);

        this.geoIcon = '📍';
      },
      (err) => {
        alert("Impossible d'obtenir votre position : " + err.message);
        this.geoIcon = '📍';
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  onInputChange(valeur: string): void {
    this.valeurActuelle = valeur.trim().toLowerCase();
    if (this.valeurActuelle === '') this.filtrer();
  }

  onSearch(event: Event): void {
    event.preventDefault();
    const select = (event.target as HTMLFormElement).querySelector(
      '.option-critere'
    ) as HTMLSelectElement;
    const input = (event.target as HTMLFormElement).querySelector(
      '.critere'
    ) as HTMLInputElement;

    this.critereActuel = select.value;
    this.valeurActuelle = input.value.trim().toLowerCase();
    this.filtrer();
  }

  private filtrer(): void {
    this.allMarkers.forEach((marker, index) => {
      const commune = this.allCommunes[index] as any;
      const champ = String(commune[this.critereActuel] ?? '').toLowerCase();

      if (this.valeurActuelle === '' || champ.includes(this.valeurActuelle)) {
        if (!this.map.hasLayer(marker)) marker.addTo(this.map);
      } else {
        if (this.map.hasLayer(marker)) this.map.removeLayer(marker);
      }
    });
  }
}