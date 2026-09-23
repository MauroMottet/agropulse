import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { PlotWithTelemetry, GeoPoint } from '../types/database';
import { MapPin, CheckCircle2, ArrowRight, X, AlertCircle } from 'lucide-react-native';

interface InPlotModalProps {
  visible: boolean;
  onClose: () => void;
  userCoords: GeoPoint | null;
  detectedPlot: PlotWithTelemetry | null;
  nearestPlot: { plot: PlotWithTelemetry; distanceMeters: number } | null;
  errorMessage?: string | null;
  onNavigateToPlot: (plotId: string) => void;
  onSimulateInCosta1: () => void;
}

export const InPlotModal: React.FC<InPlotModalProps> = ({
  visible,
  onClose,
  userCoords,
  detectedPlot,
  nearestPlot,
  errorMessage,
  onNavigateToPlot,
  onSimulateInCosta1,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={20} color="#64748B" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: detectedPlot
                    ? '#ECFDF5'
                    : errorMessage
                    ? '#FEF2F2'
                    : '#EFF6FF',
                },
              ]}
            >
              {detectedPlot ? (
                <CheckCircle2 size={28} color="#059669" />
              ) : errorMessage ? (
                <AlertCircle size={28} color="#DC2626" />
              ) : (
                <MapPin size={28} color="#2563EB" />
              )}
            </View>
            <Text style={styles.title}>
              {detectedPlot
                ? '¡Estás en el lote!'
                : errorMessage
                ? 'Ubicación GPS'
                : 'Fuera del perímetro'}
            </Text>
          </View>

          {/* Case 1: Inside a Plot */}
          {detectedPlot && (
            <View style={styles.resultBox}>
              <Text style={styles.plotName}>{detectedPlot.name}</Text>
              <Text style={styles.cropText}>{detectedPlot.crop_type}</Text>
              <View style={styles.statsRow}>
                <Text style={styles.statLabel}>Humedad actual:</Text>
                <Text style={styles.statVal}>
                  {detectedPlot.lastReading
                    ? `${detectedPlot.lastReading.moisture_pct}%`
                    : 'Sin datos'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  onClose();
                  onNavigateToPlot(detectedPlot.id);
                }}
              >
                <Text style={styles.actionBtnText}>Abrir detalle del lote</Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Case 2: Outside plots but distance calculated */}
          {!detectedPlot && !errorMessage && nearestPlot && (
            <View style={styles.resultBox}>
              <Text style={styles.infoText}>
                No te encuentras dentro del polígono de ningún lote registrado.
              </Text>
              <View style={styles.nearestBadge}>
                <Text style={styles.nearestTitle}>Lote más cercano:</Text>
                <Text style={styles.nearestName}>
                  {nearestPlot.plot.name} ({nearestPlot.distanceMeters} m)
                </Text>
              </View>

              <TouchableOpacity
                style={styles.actionBtnOutline}
                onPress={() => {
                  onClose();
                  onNavigateToPlot(nearestPlot.plot.id);
                }}
              >
                <Text style={styles.actionBtnTextOutline}>Ver {nearestPlot.plot.name}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Case 3: Error or GPS unavailable */}
          {errorMessage && (
            <View style={styles.resultBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Text style={styles.hintText}>
                Puedes probar la simulación rápida para verificar el cálculo de Point-in-Polygon:
              </Text>

              <TouchableOpacity
                style={styles.actionBtnSimulate}
                onPress={onSimulateInCosta1}
              >
                <Text style={styles.simulateBtnText}>Simular GPS dentro de "Costa 1"</Text>
              </TouchableOpacity>
            </View>
          )}

          {userCoords && (
            <Text style={styles.coordsFootnote}>
              GPS: {userCoords.latitude.toFixed(5)}, {userCoords.longitude.toFixed(5)}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  resultBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  plotName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#059669',
    textAlign: 'center',
  },
  cropText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    color: '#475569',
  },
  statVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  actionBtnOutline: {
    borderWidth: 1.5,
    borderColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnTextOutline: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 13,
  },
  actionBtnSimulate: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  simulateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 10,
  },
  nearestBadge: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nearestTitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  nearestName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  coordsFootnote: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
