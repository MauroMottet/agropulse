import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useData } from '../../src/context/DataContext';
import { useAuth } from '../../src/context/AuthContext';
import { InteractiveMap } from '../../src/components/InteractiveMap';
import { InPlotModal } from '../../src/components/InPlotModal';
import {
  isPointInPolygon,
  getDistanceMeters,
  getSemaphoreConfig,
  formatRelativeTime,
} from '../../src/utils/geo';
import { PlotWithTelemetry, GeoPoint } from '../../src/types/database';
import { Navigation, MapPin, ChevronRight, Droplet, Radio } from 'lucide-react-native';

export default function MapScreen() {
  const { plots } = useData();
  const { user, role } = useAuth();
  const router = useRouter();

  const [selectedPlot, setSelectedPlot] = useState<PlotWithTelemetry | null>(null);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [inPlotModalVisible, setInPlotModalVisible] = useState(false);
  const [detectedPlot, setDetectedPlot] = useState<PlotWithTelemetry | null>(null);
  const [nearestPlot, setNearestPlot] = useState<{ plot: PlotWithTelemetry; distanceMeters: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Point-in-Polygon check with GPS permissions
  async function handleCheckLocation() {
    setIsLocating(true);
    setGpsError(null);
    setDetectedPlot(null);
    setNearestPlot(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsError('Permiso de GPS denegado. Puedes otorgar permisos o probar la simulación rápida.');
        setInPlotModalVisible(true);
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const userCoords: GeoPoint = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(userCoords);
      evaluatePointInPolygons(userCoords);
    } catch (err: any) {
      setGpsError('No se pudo obtener la posición del dispositivo (' + (err.message || 'Error de GPS') + ').');
      setInPlotModalVisible(true);
    } finally {
      setIsLocating(false);
    }
  }

  // Evaluates user coordinates against plots
  function evaluatePointInPolygons(coords: GeoPoint) {
    let foundInside: PlotWithTelemetry | null = null;
    let closest: { plot: PlotWithTelemetry; distanceMeters: number } | null = null;

    for (const plot of plots) {
      const inside = isPointInPolygon(coords, plot.polygon);
      if (inside) {
        foundInside = plot;
        break;
      }

      // Calculate distance to centroid
      const centroid: GeoPoint = {
        latitude: plot.polygon.reduce((acc, p) => acc + p.latitude, 0) / plot.polygon.length,
        longitude: plot.polygon.reduce((acc, p) => acc + p.longitude, 0) / plot.polygon.length,
      };
      const dist = getDistanceMeters(coords, centroid);

      if (!closest || dist < closest.distanceMeters) {
        closest = { plot, distanceMeters: dist };
      }
    }

    setDetectedPlot(foundInside);
    setNearestPlot(closest);
    setInPlotModalVisible(true);
  }

  // Quick simulation function: Simulates user coordinate strictly inside Costa 1
  function handleSimulateCosta1() {
    const simulatedCoords: GeoPoint = {
      latitude: -31.3780,
      longitude: -58.0080,
    };
    setUserLocation(simulatedCoords);
    evaluatePointInPolygons(simulatedCoords);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Screen Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Mapa de Riego</Text>
            <Text style={styles.subtitle}>
              Estancia Didáctica Concordia • Rol: <Text style={styles.roleHighlight}>{role}</Text>
            </Text>
          </View>

          {/* GPS Button "Estoy en el lote" */}
          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={handleCheckLocation}
            disabled={isLocating}
            activeOpacity={0.8}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Navigation size={16} color="#FFFFFF" />
            )}
            <Text style={styles.gpsBtnText}>Estoy en el lote</Text>
          </TouchableOpacity>
        </View>

        {/* Interactive Map */}
        <InteractiveMap
          plots={plots}
          selectedPlotId={selectedPlot?.id}
          onSelectPlot={(p) => {
            setSelectedPlot(p);
            router.push(`/(tabs)/plots/${p.id}`);
          }}
          userLocation={userLocation}
        />

        {/* Plots List Cards */}
        <Text style={styles.sectionTitle}>Estado de los Lotes</Text>

        {plots.map((plot) => {
          const cfg = getSemaphoreConfig(plot.status);
          const moisture = plot.lastReading ? `${plot.lastReading.moisture_pct}%` : 'Sin datos';
          const relative = formatRelativeTime(plot.lastReading?.measured_at);

          return (
            <TouchableOpacity
              key={plot.id}
              style={[styles.plotCard, { borderLeftColor: cfg.color }]}
              onPress={() => router.push(`/(tabs)/plots/${plot.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.plotCardHeader}>
                <View style={styles.plotTitleGroup}>
                  <Text style={styles.plotCardName}>{plot.name}</Text>
                  <Text style={styles.cropText}>{plot.crop_type}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: cfg.badgeBg }]}>
                  <View style={[styles.badgeDot, { backgroundColor: cfg.color }]} />
                  <Text style={[styles.badgeText, { color: cfg.color }]}>
                    {cfg.shortLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.footerItem}>
                  <Droplet size={14} color="#059669" />
                  <Text style={styles.footerLabel}>Humedad:</Text>
                  <Text style={[styles.footerValue, { color: cfg.color }]}>{moisture}</Text>
                </View>

                <View style={styles.footerItem}>
                  <Radio size={14} color="#64748B" />
                  <Text style={styles.footerTime}>{relative}</Text>
                </View>

                <ChevronRight size={18} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* In-Plot Modal */}
      <InPlotModal
        visible={inPlotModalVisible}
        onClose={() => setInPlotModalVisible(false)}
        userCoords={userLocation}
        detectedPlot={detectedPlot}
        nearestPlot={nearestPlot}
        errorMessage={gpsError}
        onNavigateToPlot={(plotId) => {
          setInPlotModalVisible(false);
          router.push(`/(tabs)/plots/${plotId}`);
        }}
        onSimulateInCosta1={handleSimulateCosta1}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: 16,
    paddingBottom: 32,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  roleHighlight: {
    color: '#059669',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  gpsBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  gpsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginVertical: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  plotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  plotCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  plotTitleGroup: {
    flex: 1,
  },
  plotCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cropText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
