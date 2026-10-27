// assets/js/map.js - WebGIS Peta Sebaran Aset Daerah Pemprov Lampung Leaflet.js

const GISMap = {
    map: null,
    markersLayer: null,
    geoAssets: [],

    initOrResize() {
        const container = document.getElementById('leafletMap');
        if (!container) return;

        if (!this.map) {
            this.initMap();
        } else {
            this.map.invalidateSize();
        }
    },

    initMap() {
        // Inisialisasi Peta Lampung (Pusat di sekitar Bandar Lampung / Lampung Tengah)
        this.map = L.map('leafletMap', {
            center: [-5.05, 105.15],
            zoom: 9,
            zoomControl: false
        });

        // Posisi Zoom Control di kanan atas
        L.control.zoom({ position: 'topright' }).addTo(this.map);

        // Base Layer OpenStreetMap
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors | Pemprov Lampung'
        });

        // Layer CartoDB Light
        const cartoLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO'
        });

        // Layer Satelit Esri
        const esriSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri World Imagery'
        });

        // Default pakai Carto Light
        cartoLight.addTo(this.map);

        // Layer Control
        const baseMaps = {
            "Peta Terang (Clean)": cartoLight,
            "OpenStreetMap": osm,
            "Citra Satelit": esriSat
        };
        L.control.layers(baseMaps, null, { position: 'topright' }).addTo(this.map);

        this.markersLayer = L.layerGroup().addTo(this.map);

        this.loadMapAssets();
        this.setupMapFilters();
    },

    setupMapFilters() {
        ['mapFilterCategory', 'mapFilterRegency'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => {
                    this.filterMarkers();
                });
            }
        });
    },

    async loadMapAssets() {
        try {
            let result;
            if (window.Store) {
                result = Store.getGeoAssets();
            } else {
                const res = await fetch('api/assets.php?geo_only=1');
                result = await res.json();
            }

            if (!result.success) return;

            this.geoAssets = result.data;
            this.renderMarkers(this.geoAssets);
            this.populateMapFilterOptions(this.geoAssets);
        } catch (err) {
            console.error('Error loading geo assets:', err);
        }
    },

    populateMapFilterOptions(assets) {
        const regSelect = document.getElementById('mapFilterRegency');
        if (!regSelect) return;

        const regencies = [...new Set(assets.map(a => a.regency_name))].sort();
        let html = '<option value="">Semua Wilayah (15 Kab/Kota)</option>';
        regencies.forEach(r => {
            html += `<option value="${r}">${r}</option>`;
        });
        regSelect.innerHTML = html;
    },

    createCustomMarkerIcon(categoryColor, iconClass) {
        return L.divIcon({
            className: 'custom-leaflet-marker',
            html: `
                <div class="custom-pin" style="background-color: ${categoryColor};">
                    <i class="fa-solid ${iconClass}"></i>
                </div>
            `,
            iconSize: [34, 34],
            iconAnchor: [17, 34],
            popupAnchor: [0, -32]
        });
    },

    renderMarkers(assets) {
        if (!this.markersLayer) return;
        this.markersLayer.clearLayers();

        const countEl = document.getElementById('mapAssetCountBadge');
        if (countEl) countEl.textContent = `${assets.length} Titik Aset`;

        const bounds = [];

        assets.forEach(a => {
            if (!a.latitude || !a.longitude) return;

            const lat = parseFloat(a.latitude);
            const lng = parseFloat(a.longitude);
            bounds.push([lat, lng]);

            const icon = this.createCustomMarkerIcon(a.category_color, a.category_icon || 'fa-location-dot');
            const marker = L.marker([lat, lng], { icon: icon });

            // Popup Card Content
            const popupContent = `
                <div class="w-72 font-sans overflow-hidden">
                    <div class="p-3 text-white flex items-center justify-between" style="background: linear-gradient(135deg, #0f172a, ${a.category_color})">
                        <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-black/30 backdrop-blur-sm">
                            ${a.kib_type}
                        </span>
                        <span class="text-[11px] font-mono font-semibold">${a.asset_code}</span>
                    </div>
                    <div class="p-3.5 space-y-2 bg-white">
                        <h4 class="font-bold text-slate-900 text-sm leading-tight">${a.name}</h4>
                        <div class="text-xs text-slate-500 flex items-center gap-1.5">
                            <i class="fa-solid fa-building text-slate-400"></i> ${a.opd_alias || a.opd_name}
                        </div>
                        <div class="text-xs text-slate-500 flex items-center gap-1.5">
                            <i class="fa-solid fa-map-pin text-slate-400"></i> ${a.regency_name}
                        </div>
                        <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <div>
                                <div class="text-[10px] text-slate-400">Nilai Perolehan</div>
                                <div class="font-mono font-bold text-emerald-700 text-xs">${App.formatRupiah(a.acquisition_value)}</div>
                            </div>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded ${a.condition === 'Baik' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                                ${a.condition}
                            </span>
                        </div>
                        <div class="pt-2 flex items-center gap-1.5">
                            <button onclick="App.viewAssetDetail(${a.id})" class="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-bold transition-colors">
                                Rincian
                            </button>
                            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" class="w-8 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs flex items-center justify-center transition-colors" title="Buka di Google Maps">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `;

            marker.bindPopup(popupContent);
            this.markersLayer.addLayer(marker);
        });

        // Zoom fit jika ada marker
        if (bounds.length > 0 && this.map) {
            this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }
    },

    filterMarkers() {
        const catFilter = document.getElementById('mapFilterCategory') ? document.getElementById('mapFilterCategory').value : '';
        const regFilter = document.getElementById('mapFilterRegency') ? document.getElementById('mapFilterRegency').value : '';

        const filtered = this.geoAssets.filter(a => {
            const matchCat = !catFilter || a.category_id === catFilter;
            const matchReg = !regFilter || a.regency_name === regFilter;
            return matchCat && matchReg;
        });

        this.renderMarkers(filtered);
    },

    focusOnAsset(lat, lng) {
        if (!this.map) this.initMap();
        this.map.setView([lat, lng], 15);
    }
};

window.GISMap = GISMap;
