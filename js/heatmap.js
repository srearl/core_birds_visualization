import { loadCSV } from "./fetchData.js";

// Global variables for storing data and map layers
let observationData = [];
let locationMap = new Map();
let map, heatLayer;

function createMap() {
  // Initialize Leaflet map centered on Phoenix, AZ
  map = L.map("heatmap-map").setView([33.4484, -112.0740], 10);

  // Add OpenStreetMap tile layer without attribution
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: false
  }).addTo(map);
}

function populateHeatmapDropdowns(data) {
  // Extract unique species and years for dropdowns
  const speciesSet = new Set();
  const yearSet = new Set();

  data.forEach(row => {
    if (row.common_name) speciesSet.add(row.common_name);
    if (row.survey_date) {
      const year = new Date(row.survey_date).getFullYear();
      yearSet.add(year);
    }
  });

  const speciesSelect = document.getElementById("heatmap-species-select");
  const yearSelect = document.getElementById("heatmap-year-select");

  // Populate species dropdown
  [...speciesSet].sort().forEach(species => {
    const opt = document.createElement("option");
    opt.value = species;
    opt.textContent = species;
    speciesSelect.appendChild(opt);
  });

  // Add "All Years" option to year dropdown
  const allYearsOption = document.createElement("option");
  allYearsOption.value = "all";
  allYearsOption.textContent = "All Years (2000–2024)";
  yearSelect.appendChild(allYearsOption);

  // Populate year dropdown
  [...yearSet].sort().forEach(year => {
    const opt = document.createElement("option");
    opt.value = year;
    opt.textContent = year;
    yearSelect.appendChild(opt);
  });
}

function getGradientColor(value, min, max) {
  // Calculate color gradient based on bird count intensity
  const percent = (value - min) / (max - min);

  if (percent <= 0.4) {
    const ratio = percent / 0.4;
    return interpolateColor("#ffffcc", "#a1d99b", ratio);
  } else {
    const ratio = (percent - 0.4) / 0.4;
    return interpolateColor("#a1d99b", "#006837", ratio);
  }
}

function interpolateColor(color1, color2, factor) {
  // Interpolate between two colors for gradient effect
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  const r = Math.round(c1.r + (c2.r - c1.r) * factor);
  const g = Math.round(c1.g + (c2.g - c1.g) * factor);
  const b = Math.round(c1.b + (c2.b - c1.b) * factor);

  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex) {
  // Convert hex color to RGB format
  const stripped = hex.replace("#", "");
  return {
    r: parseInt(stripped.substring(0, 2), 16),
    g: parseInt(stripped.substring(2, 4), 16),
    b: parseInt(stripped.substring(4, 6), 16),
  };
}

function renderHeatmap(species, year) {
  // Remove existing heatmap layer if present
  if (heatLayer) map.removeLayer(heatLayer);

  // Filter data by species, year, and valid site code
  const filtered = observationData.filter(row => {
    let rowYear = NaN;
    if (row.survey_date) {
      const parsed = new Date(row.survey_date);
      if (!isNaN(parsed)) rowYear = parsed.getFullYear();
    }

    const isMatchingSpecies = row.common_name?.trim() === species.trim();
    const isMatchingYear = year === "all" || rowYear === parseInt(year);
    const hasSiteCode = !!row.site_code;

    return isMatchingSpecies && isMatchingYear && hasSiteCode;
  });

  // Aggregate bird counts by site
  const countMap = new Map();

  filtered.forEach(row => {
    const site = row.site_code.trim();
    const count = parseInt(row.bird_count) || 0;
    countMap.set(site, (countMap.get(site) || 0) + count);
  });

  // Create new layer group for heatmap
  heatLayer = L.layerGroup();

  const counts = Array.from(countMap.values());
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);

  // Add circle markers for each site with dynamic radius and color
  for (let [siteCode, totalCount] of countMap.entries()) {
    const loc = locationMap.get(siteCode);
    if (loc && !isNaN(loc.lat) && !isNaN(loc.long)) {
      const circle = L.circleMarker([loc.lat, loc.long], {
        radius: Math.sqrt(totalCount) * 2,
        fillColor: getGradientColor(totalCount, minCount, maxCount),
        color: "#444",
        weight: 1,
        fillOpacity: 0.7
      }).bindTooltip(`Bird Count: ${totalCount}`, { direction: "top" });

      heatLayer.addLayer(circle);
    }
  }

  // Add heatmap layer to map
  heatLayer.addTo(map);
  console.log("Circle-based heatmap rendered with points:", heatLayer.getLayers().length);
}

function initHeatmap() {
  // Initialize map and load data
  createMap();

  // Load location data first
  loadCSV("assets/cleaned_survey_locations.csv", locData => {
    locData.forEach(row => {
      locationMap.set(row.site_code.trim(), {
        lat: parseFloat(row.lat),
        long: parseFloat(row.long)
      });
    });

    // Load observation data and render heatmap
    loadCSV("assets/cleaned_observations.csv", obsData => {
      observationData = obsData;

      populateHeatmapDropdowns(obsData);

      const speciesSelect = document.getElementById("heatmap-species-select");
      const yearSelect = document.getElementById("heatmap-year-select");

      // Render initial heatmap
      renderHeatmap(speciesSelect.value, yearSelect.value);

      // Update heatmap on dropdown changes
      speciesSelect.addEventListener("change", () => {
        renderHeatmap(speciesSelect.value, yearSelect.value);
      });

      yearSelect.addEventListener("change", () => {
        renderHeatmap(speciesSelect.value, yearSelect.value);
      });
    });
  });
}

// Start heatmap initialization on page load
document.addEventListener("DOMContentLoaded", initHeatmap);
