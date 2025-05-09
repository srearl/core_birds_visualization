import { loadCSV } from "./fetchData.js";
import { populateDropdowns } from "./dropdowns.js";

// Global array to store CSV data
let globalData = [];

function renderBarChart(species) {
  // Extract unique years from survey dates
  const allYearsSet = new Set();
  globalData.forEach(row => {
    const year = new Date(row.survey_date).getFullYear();
    if (!isNaN(year)) allYearsSet.add(year);
  });

  const allYears = [...allYearsSet].sort((a, b) => a - b);

  // Filter data for the selected species
  const filtered = globalData.filter(row => row.common_name === species);

  // Aggregate bird counts by year
  const countByYear = {};
  filtered.forEach(row => {
    const year = new Date(row.survey_date).getFullYear();
    const count = parseInt(row.bird_count) || 0; 

    if (!isNaN(year)) {
      countByYear[year] = (countByYear[year] || 0) + count;
    }
  });

  const x = allYears;
  const y = allYears.map(year => countByYear[year] || 0);

  // Define Plotly trace for bar chart
  const trace = {
    x,
    y,
    type: "bar",
    marker: { color: "#3498db" }
  };

  // Configure Plotly layout for bar chart
  const layout = {
    title: {
      text: `Total Bird Counts for<br><b>"${species}"</b> Across Years`,
      font: { size: 18 },
      xanchor: "center",
      x: 0.5
    },
    xaxis: {
      title: "Years",
      tickmode: "array",
      tickvals: x,
      ticktext: x,
      tickangle: -45
    },
    yaxis: {
      title: "Bird Count"
    },
    margin: {
      t: 70,
      b: 120,
      l: 50,
      r: 30
    },
    bargap: 0.3
  };  

  // Plotly config for interactivity
  const config = {
    displayModeBar: true,
    modeBarButtons: [['toImage']],
    displaylogo: false,
    responsive: true
  };

  // Render the bar chart using Plotly
  Plotly.newPlot("bar-chart", [trace], layout, config);
}

// Initialize the bar chart on page load
document.addEventListener("DOMContentLoaded", () => {
  loadCSV("assets/cleaned_observations.csv", function(data) {
    globalData = data;

    // Populate species dropdown
    populateDropdowns(data);

    const speciesSelect = document.getElementById("species-select");

    // Render initial bar chart with default species
    renderBarChart(speciesSelect.value);

    // Update bar chart on species selection change
    speciesSelect.addEventListener("change", () => {
      renderBarChart(speciesSelect.value);
    });
  });
});
