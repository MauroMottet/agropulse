import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, {
  Polygon,
  Polyline,
  Circle,
  Text as SvgText,
  G,
  Rect,
  Line,
} from 'react-native-svg';
import { PlotWithTelemetry, GeoPoint } from '../types/database';
import { getSemaphoreConfig } from '../utils/geo';
import { Navigation, ZoomIn, ZoomOut, Compass } from 'lucide-react-native';

interface InteractiveMapProps {
  plots: PlotWithTelemetry[];
  selectedPlotId?: string;
  onSelectPlot: (plot: PlotWithTelemetry) => void;
  userLocation?: GeoPoint | null;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  plots,
  selectedPlotId,
  onSelectPlot,
  userLocation,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const screenWidth = Dimensions.get('window').width;
  const mapWidth = Math.min(screenWidth - 32, 600);
  const mapHeight = 320;

  // Geographic bounds for Concordia agricultural area
  const MIN_LAT = -31.396;
  const MAX_LAT = -31.368;
  const MIN_LNG = -58.028;
  const MAX_LNG = -58.002;

  // Project geographic coordinates to SVG canvas coordinates
  function projectPoint(lat: number, lng: number): { x: number; y: number } {
    const padding = 35;
    const innerW = mapWidth - padding * 2;
    const innerH = mapHeight - padding * 2;

    const xRatio = (lng - MIN_LNG) / (MAX_LNG - MIN_LNG);
    // Invert Y because latitude grows northwards while SVG Y grows downwards
    const yRatio = 1 - (lat - MIN_LAT) / (MAX_LAT - MIN_LAT);

    const x = padding + xRatio * innerW;
    const y = padding + yRatio * innerH;

    // Apply zoom around center
    const cx = mapWidth / 2;
    const cy = mapHeight / 2;
    const zx = cx + (x - cx) * zoomLevel;
    const zy = cy + (y - cy) * zoomLevel;

    return { x: zx, y: zy };
  }

  // Calculate polygon centroid for label placement
  function getCentroid(coords: GeoPoint[]): { x: number; y: number } {
    let sumLat = 0;
    let sumLng = 0;
    for (const p of coords) {
      sumLat += p.latitude;
      sumLng += p.longitude;
    }
    const avgLat = sumLat / coords.length;
    const avgLng = sumLng / coords.length;
    return projectPoint(avgLat, avgLng);
  }

  return (
    <View style={styles.container}>
      {/* Map Header with Concordia location badge */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Compass size={18} color="#059669" />
          <Text style={styles.headerTitle}>Concordia, Entre Ríos</Text>
        </View>
        <Text style={styles.headerSubtitle}>Estancia Didáctica • 3 Lotes Activos</Text>
      </View>

      {/* Interactive SVG Canvas */}
      <View style={[styles.canvasWrapper, { width: mapWidth, height: mapHeight }]}>
        <Svg width={mapWidth} height={mapHeight} style={styles.svg}>
          {/* Subtle Grid Lines */}
          {[0.25, 0.5, 0.75].map((ratio) => (
            <React.Fragment key={ratio}>
              <Line
                x1={0}
                y1={mapHeight * ratio}
                x2={mapWidth}
                y2={mapHeight * ratio}
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <Line
                x1={mapWidth * ratio}
                y1={0}
                x2={mapWidth * ratio}
                y2={mapHeight}
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            </React.Fragment>
          ))}

          {/* Render Plot Polygons */}
          {plots.map((plot) => {
            const config = getSemaphoreConfig(plot.status);
            const isSelected = plot.id === selectedPlotId;
            const pointsString = plot.polygon
              .map((p) => {
                const pt = projectPoint(p.latitude, p.longitude);
                return `${pt.x},${pt.y}`;
              })
              .join(' ');

            const center = getCentroid(plot.polygon);

            return (
              <G key={plot.id} onPress={() => onSelectPlot(plot)}>
                {/* Polygon Area */}
                <Polygon
                  points={pointsString}
                  fill={config.color}
                  fillOpacity={isSelected ? 0.45 : 0.25}
                  stroke={isSelected ? '#0F172A' : config.color}
                  strokeWidth={isSelected ? 3.5 : 2}
                  strokeDasharray={plot.status === 'stale' ? '6,3' : undefined}
                />

                {/* Plot Name Badge */}
                <Rect
                  x={center.x - 38}
                  y={center.y - 18}
                  width={76}
                  height={32}
                  rx={8}
                  fill="#FFFFFF"
                  stroke={config.color}
                  strokeWidth={1.5}
                />
                <SvgText
                  x={center.x}
                  y={center.y - 4}
                  fill="#0F172A"
                  fontSize={11}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {plot.name}
                </SvgText>
                <SvgText
                  x={center.x}
                  y={center.y + 9}
                  fill={config.color}
                  fontSize={10}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {plot.lastReading ? `${plot.lastReading.moisture_pct}%` : 'S/D'}
                </SvgText>
              </G>
            );
          })}

          {/* User Location Marker (if detected) */}
          {userLocation && (
            <G>
              {(() => {
                const pt = projectPoint(userLocation.latitude, userLocation.longitude);
                return (
                  <>
                    <Circle
                      cx={pt.x}
                      cy={pt.y}
                      r={14}
                      fill="rgba(59, 130, 246, 0.25)"
                    />
                    <Circle
                      cx={pt.x}
                      cy={pt.y}
                      r={7}
                      fill="#2563EB"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  </>
                );
              })()}
            </G>
          )}
        </Svg>

        {/* Map Zoom Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => setZoomLevel((z) => Math.min(1.8, +(z + 0.2).toFixed(1)))}
          >
            <ZoomIn size={18} color="#1E293B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => setZoomLevel((z) => Math.max(0.8, +(z - 0.2).toFixed(1)))}
          >
            <ZoomOut size={18} color="#1E293B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Semaphore Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Óptimo</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>Seco (&lt;25%)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.legendText}>Exceso (&gt;45%)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#64748B' }]} />
          <Text style={styles.legendText}>Stale (&gt;15m)</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  header: {
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  canvasWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  controls: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    elevation: 2,
  },
  controlBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginVertical: 2,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
});
