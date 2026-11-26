
import React, { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import './Graph.css';

/**
 * Get theme-aware colors for Plotly.
 */
function getPlotColors(dark) {
  return {
    paperBg: dark ? '#22263a' : '#ffffff',
    plotBg: dark ? '#1a1d27' : '#f8f9ff',
    gridClr: dark ? '#2e3350' : '#dde1f5',
    textClr: dark ? '#e8eaf6' : '#1a1d2e',
    lineClr: dark ? '#5c7cfa' : '#3b5bdb',
    legendBg: dark ? 'rgba(26,29,39,.8)' : 'rgba(255,255,255,.85)',

    bandColor: dark
      ? 'rgba(255, 159, 67, 0.25)'
      : 'rgba(230, 126, 34, 0.18)',
  };
}

/**
 * Convert received power into the selected display quantity.
 *
 * Power mode: dBm
 * Loss mode: dB
 */
function convertPowerValues(values, Pt, displayMode) {
  if (!Array.isArray(values)) return [];

  if (displayMode === 'loss') {
    return values.map((value) => Pt - value);
  }

  return values;
}

/**
 * Graph 1: Received power / transmission loss vs distance.
 */
function DistanceGraph({
  distances,
  Pr,
  breakpoint,
  uncertainty,
  dark,
  displayMode,
  Pt,
}) {
  const colors = getPlotColors(dark);
  const isLoss = displayMode === 'loss';

  const displayedPr = useMemo(
    () => convertPowerValues(Pr, Pt, displayMode),
    [Pr, Pt, displayMode]
  );

  // When power is converted into loss, the uncertainty limits invert.
  const bandUpper = useMemo(() => {
    if (!uncertainty || !Array.isArray(uncertainty.upper)) return [];

    return isLoss
      ? convertPowerValues(uncertainty.lower, Pt, 'loss')
      : uncertainty.upper;
  }, [uncertainty, Pt, isLoss]);

  const bandLower = useMemo(() => {
    if (!uncertainty || !Array.isArray(uncertainty.lower)) return [];

    return isLoss
      ? convertPowerValues(uncertainty.upper, Pt, 'loss')
      : uncertainty.lower;
  }, [uncertainty, Pt, isLoss]);

  const traces = useMemo(() => {
    const t = [];

    const hasUncertainty =
      uncertainty &&
      Array.isArray(bandUpper) &&
      Array.isArray(bandLower) &&
      bandUpper.length === distances.length &&
      bandLower.length === distances.length;

    if (hasUncertainty) {
      t.push({
        x: distances,
        y: bandUpper,
        mode: 'lines',
        line: { color: 'rgba(0,0,0,0)', width: 0 },
        showlegend: false,
        hoverinfo: 'skip',
        type: 'scatter',
      });

      t.push({
        x: distances,
        y: bandLower,
        mode: 'lines',
        line: { color: 'rgba(0,0,0,0)', width: 0 },
        fill: 'tonexty',
        fillcolor: colors.bandColor,
        name: 'Faixa de incerteza',
        showlegend: true,
        hoverinfo: 'skip',
        type: 'scatter',
      });
    }

    // Main curve
    t.push({
      x: distances,
      y: displayedPr,
      mode: 'lines',
      name: isLoss
        ? 'Perda de transmissão (dB)'
        : 'Potência recebida (dBm)',
      line: {
        color: colors.lineClr,
        width: 1,
      },
      hovertemplate: isLoss
        ? '<b>Distância</b>: %{x:.1f} m<br><b>Perda de transmissão</b>: %{y:.2f} dB<extra></extra>'
        : '<b>Distância</b>: %{x:.1f} m<br><b>Potência recebida</b>: %{y:.2f} dBm<extra></extra>',
      type: 'scatter',
    });

    return t;
  }, [
    distances,
    displayedPr,
    bandUpper,
    bandLower,
    uncertainty,
    colors,
    isLoss,
  ]);

  const prMin = displayedPr.length
    ? Math.min(...displayedPr)
    : -100;

  const prMax = displayedPr.length
    ? Math.max(...displayedPr)
    : 0;

  const quantityName = isLoss
    ? 'Perda de transmissão (dB)'
    : 'Potência recebida (dBm)';

  const layout = useMemo(
    () => ({
      paper_bgcolor: colors.paperBg,
      plot_bgcolor: colors.plotBg,

      margin: { l: 65, r: 30, t: 45, b: 55 },

      title: {
        text: isLoss
          ? 'Perda de Transmissão vs Distância'
          : 'Potência Recebida vs Distância',
        font: {
          color: colors.textClr,
          size: 15,
          family: 'Segoe UI, sans-serif',
        },
      },

      xaxis: {
        title: {
          text: 'Distância (m)',
          font: { color: colors.textClr },
        },
        type: 'log',
        tickcolor: colors.gridClr,
        gridcolor: colors.gridClr,
        tickfont: { color: colors.textClr },
        showgrid: true,
      },

      yaxis: {
        title: {
          text: quantityName,
          font: { color: colors.textClr },
        },
        tickcolor: colors.gridClr,
        gridcolor: colors.gridClr,
        tickfont: { color: colors.textClr },
        showgrid: true,
      },

      // Original transition line preserved
      shapes: breakpoint
        ? [
            {
              type: 'line',
              x0: breakpoint,
              x1: breakpoint,
              xref: 'x',
              y0: prMin,
              y1: prMax,
              yref: 'y',
              line: {
                color: '#f03e3e',
                dash: 'dash',
                width: 2,
              },
            },
          ]
        : [],

      // Original annotation preserved
      annotations: breakpoint
        ? [
            {
              x: Math.log10(breakpoint),
              xref: 'x',
              y: prMax,
              yref: 'y',
              text: `<b>Transição</b><br>${breakpoint.toFixed(1)} m`,
              showarrow: true,
              arrowcolor: '#f03e3e',
              arrowhead: 2,
              ax: 50,
              ay: -30,
              font: {
                color: '#f03e3e',
                size: 11,
              },
              bgcolor: colors.paperBg,
              bordercolor: '#f03e3e',
              borderwidth: 1,
              borderpad: 4,
            },
          ]
        : [],

      legend: {
        x: 0.01,
        y: 0.01,
        bgcolor: colors.legendBg,
        bordercolor: colors.gridClr,
        borderwidth: 1,
        font: { color: colors.textClr },
      },
    }),
    [breakpoint, prMin, prMax, colors, isLoss, quantityName]
  );

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: [
      'select2d',
      'lasso2d',
      'autoScale2d',
    ],
    displaylogo: false,
  };

  return (
    <Plot
      data={traces}
      layout={layout}
      config={config}
      className="plot-container"
    />
  );
}

/**
 * Graph 2: Received power / transmission loss vs transmitter height.
 */
function HeightGraph({
  heights,
  Pr,
  uncertainty,
  dark,
  displayMode,
  Pt,
}) {
  const colors = getPlotColors(dark);
  const isLoss = displayMode === 'loss';

  const displayedPr = useMemo(
    () => convertPowerValues(Pr, Pt, displayMode),
    [Pr, Pt, displayMode]
  );

  // Invert uncertainty limits when displaying transmission loss.
  const bandUpper = useMemo(() => {
    if (!uncertainty || !Array.isArray(uncertainty.upper)) return [];

    return isLoss
      ? convertPowerValues(uncertainty.lower, Pt, 'loss')
      : uncertainty.upper;
  }, [uncertainty, Pt, isLoss]);

  const bandLower = useMemo(() => {
    if (!uncertainty || !Array.isArray(uncertainty.lower)) return [];

    return isLoss
      ? convertPowerValues(uncertainty.upper, Pt, 'loss')
      : uncertainty.lower;
  }, [uncertainty, Pt, isLoss]);

  const traces = useMemo(() => {
    const t = [];

    const hasUncertainty =
      uncertainty &&
      bandUpper.length === heights.length &&
      bandLower.length === heights.length;

    if (hasUncertainty) {
      t.push({
        x: [
          ...bandUpper,
          ...[...bandLower].reverse(),
        ],
        y: [
          ...heights,
          ...[...heights].reverse(),
        ],
        fill: 'toself',
        fillcolor: colors.bandColor,
        line: { color: 'transparent' },
        name: 'Faixa de incerteza',
        showlegend: true,
        hoverinfo: 'skip',
        type: 'scatter',
      });
    }

    // Main curve
    t.push({
      x: displayedPr,
      y: heights,
      mode: 'lines',
      name: isLoss
        ? 'Perda de transmissão (dB)'
        : 'Potência recebida (dBm)',
      line: {
        color: colors.lineClr,
        width: 2.2,
      },
      hovertemplate: isLoss
        ? '<b>ht</b>: %{y:.1f} m<br><b>Perda de transmissão</b>: %{x:.2f} dB<extra></extra>'
        : '<b>ht</b>: %{y:.1f} m<br><b>Potência recebida</b>: %{x:.2f} dBm<extra></extra>',
      type: 'scatter',
    });

    return t;
  }, [
    heights,
    displayedPr,
    bandUpper,
    bandLower,
    uncertainty,
    colors,
    isLoss,
  ]);

  const quantityName = isLoss
    ? 'Perda de transmissão (dB)'
    : 'Potência recebida (dBm)';

  const layout = useMemo(
    () => ({
      paper_bgcolor: colors.paperBg,
      plot_bgcolor: colors.plotBg,

      margin: { l: 65, r: 30, t: 45, b: 55 },

      title: {
        text: isLoss
          ? 'Perda de Transmissão vs Altura do Transmissor'
          : 'Potência Recebida vs Altura do Transmissor',
        font: {
          color: colors.textClr,
          size: 15,
          family: 'Segoe UI, sans-serif',
        },
      },

      xaxis: {
        title: {
          text: quantityName,
          font: { color: colors.textClr },
        },
        tickcolor: colors.gridClr,
        gridcolor: colors.gridClr,
        tickfont: { color: colors.textClr },
        showgrid: true,
      },

      yaxis: {
        title: {
          text: 'Altura do transmissor — ht (m)',
          font: { color: colors.textClr },
        },
        tickcolor: colors.gridClr,
        gridcolor: colors.gridClr,
        tickfont: { color: colors.textClr },
        showgrid: true,
      },

      legend: {
        x: 0.01,
        y: 0.99,
        bgcolor: colors.legendBg,
        bordercolor: colors.gridClr,
        borderwidth: 1,
        font: { color: colors.textClr },
      },
    }),
    [colors, isLoss, quantityName]
  );

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: [
      'select2d',
      'lasso2d',
      'autoScale2d',
    ],
    displaylogo: false,
  };

  return (
    <Plot
      data={traces}
      layout={layout}
      config={config}
      className="plot-container"
    />
  );
}

/**
 * Main Graph component with tab switching.
 */
export default function Graph({
  activeTab,
  onTabChange,

  // Distance graph props
  distances,
  Pr,
  breakpoint,
  uncertaintyDist,

  // Height graph props
  heights,
  PrHeight,
  uncertaintyHeight,

  // Transmitted power
  Pt,

  // Theme
  dark,
}) {
  const [displayMode, setDisplayMode] = useState('power');

  const hasDistData =
    distances &&
    Pr &&
    distances.length > 0;

  const hasHeightData =
    heights &&
    PrHeight &&
    heights.length > 0;

  return (
    <div className="plot-card">
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'distance' ? 'active' : ''}`}
          onClick={() => onTabChange('distance')}
        >
          📊 Potência vs Distância
        </button>

        <button
          className={`tab-btn ${activeTab === 'height' ? 'active' : ''}`}
          onClick={() => onTabChange('height')}
        >
          📐 Potência vs Altura do Transmissor
        </button>
      </div>

      <div className="plot-area">
        {activeTab === 'distance' && hasDistData && (
          <DistanceGraph
            distances={distances}
            Pr={Pr}
            breakpoint={breakpoint}
            uncertainty={uncertaintyDist}
            dark={dark}
            displayMode={displayMode}
            Pt={Pt}
          />
        )}

        {activeTab === 'height' && hasHeightData && (
          <HeightGraph
            heights={heights}
            Pr={PrHeight}
            uncertainty={uncertaintyHeight}
            dark={dark}
            displayMode={displayMode}
            Pt={Pt}
          />
        )}

        {(
          (activeTab === 'distance' && !hasDistData) ||
          (activeTab === 'height' && !hasHeightData)
        ) && (
          <div className="plot-placeholder">
            <p>
              Clique em <strong>⚡ Calcular</strong> para gerar o gráfico.
            </p>
          </div>
        )}
      </div>

      <div className="display-mode-control">
        <label htmlFor="display-mode">
          Grandeza apresentada no gráfico:
        </label>

        <select
          id="display-mode"
          value={displayMode}
          onChange={(e) => setDisplayMode(e.target.value)}
        >
          <option value="power">Potência recebida (dBm)</option>
          <option value="loss">Perda de transmissão (dB)</option>
        </select>
      </div>

      <p className="hint">
        Zoom: scroll &bull; Pan: clique e arraste &bull; Hover: passe o mouse sobre a curva
      </p>
    </div>
  );
}
