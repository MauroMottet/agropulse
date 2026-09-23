import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Polyline,
  Line,
  Circle,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';
import { Reading } from '../types/database';

interface TelemetryChartProps {
  readings: Reading[];
  thresholdMin: number;
  thresholdMax: number;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  readings,
  thresholdMin,
  thresholdMax,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.min(screenWidth - 48, 540);
  const chartHeight = 180;
  const paddingX = 42;
  const paddingY = 24;

  const innerW = chartWidth - paddingX - 16;
  const innerH = chartHeight - paddingY * 2;

  // Vertical range (moisture from 0% to 60%)
  const MIN_VAL = 0;
  const MAX_VAL = 60;

  function getY(val: number): number {
    const clamped = Math.max(MIN_VAL, Math.min(MAX_VAL, val));
    const ratio = (clamped - MIN_VAL) / (MAX_VAL - MIN_VAL);
    return paddingY + innerH * (1 - ratio);
  }

  // Ensure we have at least 12 readings for the 6h span
  const sorted = [...readings].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  );

  const points = sorted.map((r, i) => {
    const x = paddingX + (i / Math.max(1, sorted.length - 1)) * innerW;
    const y = getY(r.moisture_pct);
    return { x, y, reading: r };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Shaded area under the curve
  const areaPoints = points.length > 0
    ? `${points[0].x},${paddingY + innerH} ${polylinePoints} ${points[points.length - 1].x},${paddingY + innerH}`
    : '';

  const yThreshMin = getY(thresholdMin);
  const yThreshMax = getY(thresholdMax);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Historial de Humedad (Últimas 6 Horas)</Text>
        <Text style={styles.pointsBadge}>{sorted.length} lecturas</Text>
      </View>

      <Svg width={chartWidth} height={chartHeight} style={styles.svg}>
        {/* Horizontal reference grid lines */}
        {[0, 20, 40, 60].map((val) => {
          const y = getY(val);
          return (
            <React.Fragment key={val}>
              <Line
                x1={paddingX}
                y1={y}
                x2={chartWidth - 16}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
              <SvgText
                x={paddingX - 8}
                y={y + 4}
                fill="#94A3B8"
                fontSize={10}
                textAnchor="end"
              >
                {val}%
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Threshold Min Dashed Line (Red/Amber) */}
        <Line
          x1={paddingX}
          y1={yThreshMin}
          x2={chartWidth - 16}
          y2={yThreshMin}
          stroke="#EF4444"
          strokeWidth="1.5"
          strokeDasharray="4,4"
        />
        <SvgText
          x={chartWidth - 20}
          y={yThreshMin - 4}
          fill="#EF4444"
          fontSize={9}
          fontWeight="bold"
          textAnchor="end"
        >
          Mín {thresholdMin}%
        </SvgText>

        {/* Threshold Max Dashed Line (Blue) */}
        <Line
          x1={paddingX}
          y1={yThreshMax}
          x2={chartWidth - 16}
          y2={yThreshMax}
          stroke="#3B82F6"
          strokeWidth="1.5"
          strokeDasharray="4,4"
        />
        <SvgText
          x={chartWidth - 20}
          y={yThreshMax - 4}
          fill="#3B82F6"
          fontSize={9}
          fontWeight="bold"
          textAnchor="end"
        >
          Máx {thresholdMax}%
        </SvgText>

        {/* Gradient/Shaded area */}
        {areaPoints.length > 0 && (
          <Polygon points={areaPoints} fill="rgba(16, 185, 129, 0.12)" />
        )}

        {/* Moisture Trend Polyline */}
        {polylinePoints.length > 0 && (
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke="#10B981"
            strokeWidth="2.5"
          />
        )}

        {/* Data points */}
        {points.map((p, idx) => {
          const isLatest = idx === points.length - 1;
          return (
            <React.Fragment key={idx}>
              <Circle
                cx={p.x}
                cy={p.y}
                r={isLatest ? 5 : 3}
                fill={isLatest ? '#059669' : '#10B981'}
                stroke="#FFFFFF"
                strokeWidth={isLatest ? 2 : 1}
              />
            </React.Fragment>
          );
        })}

        {/* X-axis time marks */}
        <SvgText x={paddingX} y={chartHeight - 6} fill="#94A3B8" fontSize={9} textAnchor="start">
          -6h
        </SvgText>
        <SvgText x={paddingX + innerW * 0.33} y={chartHeight - 6} fill="#94A3B8" fontSize={9} textAnchor="middle">
          -4h
        </SvgText>
        <SvgText x={paddingX + innerW * 0.66} y={chartHeight - 6} fill="#94A3B8" fontSize={9} textAnchor="middle">
          -2h
        </SvgText>
        <SvgText x={chartWidth - 16} y={chartHeight - 6} fill="#059669" fontSize={9} fontWeight="bold" textAnchor="end">
          Ahora
        </SvgText>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  pointsBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  svg: {
    alignSelf: 'center',
  },
});
