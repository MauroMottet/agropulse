import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useData } from '../../../src/context/DataContext';
import { getSemaphoreConfig, formatRelativeTime } from '../../../src/utils/geo';
import { Droplet, Thermometer, Battery, ChevronRight, Sprout } from 'lucide-react-native';

export default function PlotsListScreen() {
  const { plots } = useData();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Lotes de Cultivo</Text>
          <Text style={styles.subtitle}>
            Estancia Didáctica Concordia • Telemetría y Actuadores
          </Text>
        </View>

        {plots.map((plot) => {
          const cfg = getSemaphoreConfig(plot.status);
          const reading = plot.lastReading;
          const valve = plot.valve;

          return (
            <TouchableOpacity
              key={plot.id}
              style={[styles.card, { borderLeftColor: cfg.color }]}
              onPress={() => router.push(`/(tabs)/plots/${plot.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.titleGroup}>
                  <View style={styles.cropIconRow}>
                    <Sprout size={18} color="#059669" />
                    <Text style={styles.plotName}>{plot.name}</Text>
                  </View>
                  <Text style={styles.cropType}>{plot.crop_type}</Text>
                </View>

                <View style={[styles.badge, { backgroundColor: cfg.badgeBg }]}>
                  <View style={[styles.badgeDot, { backgroundColor: cfg.color }]} />
                  <Text style={[styles.badgeText, { color: cfg.color }]}>
                    {cfg.shortLabel}
                  </Text>
                </View>
              </View>

              {/* Metrics Grid */}
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <View style={styles.metricLabelRow}>
                    <Droplet size={14} color="#0284C7" />
                    <Text style={styles.metricLabel}>Humedad</Text>
                  </View>
                  <Text style={[styles.metricValue, { color: cfg.color }]}>
                    {reading ? `${reading.moisture_pct}%` : 'S/D'}
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <View style={styles.metricLabelRow}>
                    <Thermometer size={14} color="#D97706" />
                    <Text style={styles.metricLabel}>Temperatura</Text>
                  </View>
                  <Text style={styles.metricValue}>
                    {reading ? `${reading.temperature_c}°C` : 'S/D'}
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <View style={styles.metricLabelRow}>
                    <Battery size={14} color="#059669" />
                    <Text style={styles.metricLabel}>Batería</Text>
                  </View>
                  <Text style={styles.metricValue}>
                    {reading ? `${reading.battery_pct}%` : 'S/D'}
                  </Text>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.cardFooter}>
                <Text style={styles.valveInfo}>
                  Válvula: <Text style={{ fontWeight: '700', color: valve?.status === 'open' ? '#2563EB' : '#64748B' }}>
                    {valve?.status === 'open' ? 'ABIERTA' : 'CERRADA'}
                  </Text>
                </Text>
                <View style={styles.footerRight}>
                  <Text style={styles.relativeTime}>
                    {formatRelativeTime(reading?.measured_at)}
                  </Text>
                  <ChevronRight size={18} color="#94A3B8" />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleGroup: {
    flex: 1,
  },
  cropIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  plotName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  cropType: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  valveInfo: {
    fontSize: 12,
    color: '#475569',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  relativeTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
