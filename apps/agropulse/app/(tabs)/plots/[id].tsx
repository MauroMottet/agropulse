import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useData } from '../../../src/context/DataContext';
import { useAuth } from '../../../src/context/AuthContext';
import { TelemetryChart } from '../../../src/components/TelemetryChart';
import { ValveControlCard } from '../../../src/components/ValveControlCard';
import { getSemaphoreConfig, formatRelativeTime } from '../../../src/utils/geo';
import {
  ArrowLeft,
  Droplet,
  Thermometer,
  Battery,
  Sliders,
  Check,
  AlertCircle,
  Clock,
  Sprout,
} from 'lucide-react-native';

export default function PlotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { plots, historyByPlot, updateThresholdMin, sendIrrigationCommand } = useData();
  const { role } = useAuth();

  const plot = plots.find((p) => p.id === id);
  const history = id ? historyByPlot[id] || [] : [];

  const [savingThreshold, setSavingThreshold] = useState(false);
  const [thresholdSuccess, setThresholdSuccess] = useState(false);
  const [thresholdError, setThresholdError] = useState<string | null>(null);

  if (!plot) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Lote no encontrado.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={18} color="#FFFFFF" />
            <Text style={styles.backBtnText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const cfg = getSemaphoreConfig(plot.status);
  const reading = plot.lastReading;
  const isAdvisor = role === 'advisor';

  async function handleAdjustThreshold(delta: number) {
    if (isAdvisor || savingThreshold) return;

    const newMin = Math.max(10, Math.min(plot!.threshold_max - 5, plot!.threshold_min + delta));
    if (newMin === plot!.threshold_min) return;

    setSavingThreshold(true);
    setThresholdError(null);
    setThresholdSuccess(false);

    const result = await updateThresholdMin(plot!.id, newMin);
    setSavingThreshold(false);

    if (result.success) {
      setThresholdSuccess(true);
      setTimeout(() => setThresholdSuccess(false), 3000);
    } else {
      setThresholdError(result.error || 'Error al guardar umbral.');
      setTimeout(() => setThresholdError(null), 5000);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.backIconBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.navTitleGroup}>
            <Text style={styles.navTitle}>{plot.name}</Text>
            <Text style={styles.navSubtitle}>{plot.crop_type}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.badgeBg }]}>
            <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.shortLabel}</Text>
          </View>
        </View>

        {/* Current Telemetry Card */}
        <View style={[styles.telemetryCard, { borderColor: cfg.borderColor }]}>
          <View style={styles.telemetryHeader}>
            <View style={styles.telemetryTitleRow}>
              <Sprout size={18} color="#059669" />
              <Text style={styles.cardSectionTitle}>Última Lectura de Telemetría</Text>
            </View>
            <View style={styles.timeTag}>
              <Clock size={12} color="#64748B" />
              <Text style={styles.timeText}>
                {formatRelativeTime(reading?.measured_at)}
              </Text>
            </View>
          </View>

          <View style={styles.kpiRow}>
            {/* Moisture KPI */}
            <View style={styles.kpiItem}>
              <View style={styles.kpiHeader}>
                <Droplet size={18} color={cfg.color} />
                <Text style={styles.kpiLabel}>Humedad</Text>
              </View>
              <Text style={[styles.kpiMainValue, { color: cfg.color }]}>
                {reading ? `${reading.moisture_pct}%` : 'S/D'}
              </Text>
              <Text style={styles.kpiFootnote}>
                Rango objetivo: {plot.threshold_min}% - {plot.threshold_max}%
              </Text>
            </View>

            {/* Temperature & Battery */}
            <View style={styles.kpiSubGroup}>
              <View style={styles.kpiSubItem}>
                <Thermometer size={16} color="#D97706" />
                <Text style={styles.kpiSubLabel}>Temperatura:</Text>
                <Text style={styles.kpiSubValue}>
                  {reading ? `${reading.temperature_c}°C` : 'S/D'}
                </Text>
              </View>
              <View style={styles.kpiSubItem}>
                <Battery size={16} color="#059669" />
                <Text style={styles.kpiSubLabel}>Batería Sensor:</Text>
                <Text style={styles.kpiSubValue}>
                  {reading ? `${reading.battery_pct}%` : 'S/D'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 6-Hour Telemetry Chart */}
        <TelemetryChart
          readings={history}
          thresholdMin={plot.threshold_min}
          thresholdMax={plot.threshold_max}
        />

        {/* Minimum Threshold Adjustment Card */}
        <View style={styles.thresholdCard}>
          <View style={styles.thresholdHeader}>
            <View style={styles.thresholdTitleRow}>
              <Sliders size={18} color="#0284C7" />
              <Text style={styles.cardSectionTitle}>Ajuste de Umbral Mínimo</Text>
            </View>
            {isAdvisor && (
              <Text style={styles.advisorBadge}>Solo lectura (Asesor)</Text>
            )}
          </View>

          <Text style={styles.thresholdExplanation}>
            Si la humedad desciende por debajo de este valor, el lote pasa a estado "Seco" (Rojo) indicando necesidad de riego.
          </Text>

          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, (isAdvisor || savingThreshold) && styles.stepperDisabled]}
              onPress={() => handleAdjustThreshold(-1)}
              disabled={isAdvisor || savingThreshold}
            >
              <Text style={styles.stepperBtnText}>- 1%</Text>
            </TouchableOpacity>

            <View style={styles.thresholdDisplay}>
              <Text style={styles.thresholdValue}>{plot.threshold_min}%</Text>
              <Text style={styles.thresholdSub}>Umbral Seco</Text>
            </View>

            <TouchableOpacity
              style={[styles.stepperBtn, (isAdvisor || savingThreshold) && styles.stepperDisabled]}
              onPress={() => handleAdjustThreshold(1)}
              disabled={isAdvisor || savingThreshold}
            >
              <Text style={styles.stepperBtnText}>+ 1%</Text>
            </TouchableOpacity>
          </View>

          {savingThreshold && (
            <View style={styles.thresholdFeedback}>
              <ActivityIndicator size="small" color="#0284C7" />
              <Text style={styles.savingText}>Guardando en Supabase...</Text>
            </View>
          )}

          {thresholdSuccess && (
            <View style={styles.thresholdSuccessBox}>
              <Check size={14} color="#059669" />
              <Text style={styles.thresholdSuccessText}>Umbral actualizado exitosamente.</Text>
            </View>
          )}

          {thresholdError && (
            <View style={styles.thresholdErrorBox}>
              <AlertCircle size={14} color="#DC2626" />
              <Text style={styles.thresholdErrorText}>{thresholdError}</Text>
            </View>
          )}
        </View>

        {/* Valve Control Card */}
        <ValveControlCard
          valve={plot.valve}
          activeCommand={plot.activeCommand}
          userRole={role}
          plotId={plot.id}
          onSendCommand={sendIrrigationCommand}
        />
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
    paddingBottom: 36,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backIconBtn: {
    padding: 8,
    marginRight: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navTitleGroup: {
    flex: 1,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  navSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  telemetryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  telemetryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  telemetryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiItem: {
    flex: 1,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  kpiMainValue: {
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 4,
  },
  kpiFootnote: {
    fontSize: 11,
    color: '#94A3B8',
  },
  kpiSubGroup: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  kpiSubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kpiSubLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  kpiSubValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  thresholdCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  thresholdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  thresholdTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  advisorBadge: {
    fontSize: 11,
    color: '#B45309',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600',
  },
  thresholdExplanation: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 8,
  },
  stepperBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stepperDisabled: {
    opacity: 0.5,
  },
  stepperBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284C7',
  },
  thresholdDisplay: {
    alignItems: 'center',
  },
  thresholdValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  thresholdSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  thresholdFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    justifyContent: 'center',
  },
  savingText: {
    fontSize: 11,
    color: '#0284C7',
  },
  thresholdSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 8,
  },
  thresholdSuccessText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  thresholdErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 8,
  },
  thresholdErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
});
