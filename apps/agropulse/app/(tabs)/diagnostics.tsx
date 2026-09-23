import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useData } from '../../src/context/DataContext';
import { useAuth } from '../../src/context/AuthContext';
import {
  Activity,
  User,
  Building,
  Radio,
  Timer,
  Server,
  Database,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react-native';
import { formatRelativeTime } from '../../src/utils/geo';

export default function DiagnosticsScreen() {
  const { user, role, organization } = useAuth();
  const { lastTick, apparentLagSec, isRealtimeConnected } = useData();

  function formatLag(sec: number): string {
    if (sec < 60) return `${sec} segundos`;
    const min = Math.floor(sec / 60);
    const remSec = sec % 60;
    return `${min}m ${remSec}s`;
  }

  const lagStatusColor =
    apparentLagSec < 15 ? '#059669' : apparentLagSec < 60 ? '#D97706' : '#DC2626';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Diagnóstico del Sistema</Text>
          <Text style={styles.subtitle}>
            Monitor de telemetría IoT, pipeline de streaming y latencia aparente
          </Text>
        </View>

        {/* Live Lag Counter Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderRow}>
              <Timer size={18} color={lagStatusColor} />
              <Text style={styles.cardTitle}>Lag Aparente de Telemetría</Text>
            </View>
            <View style={[styles.liveBadge, { backgroundColor: isRealtimeConnected ? '#ECFDF5' : '#FEF2F2' }]}>
              <View style={[styles.liveDot, { backgroundColor: isRealtimeConnected ? '#059669' : '#DC2626' }]} />
              <Text style={[styles.liveText, { color: isRealtimeConnected ? '#059669' : '#DC2626' }]}>
                {isRealtimeConnected ? 'CONECTADO' : 'DESCONECTADO'}
              </Text>
            </View>
          </View>

          <View style={styles.lagValueRow}>
            <Text style={[styles.lagBigNumber, { color: lagStatusColor }]}>
              {apparentLagSec}
            </Text>
            <View style={styles.lagUnitGroup}>
              <Text style={styles.lagUnit}>segundos</Text>
              <Text style={styles.lagExplanation}>
                Tiempo transcurrido desde la última muestra registrada (Now - measured_at)
              </Text>
            </View>
          </View>
        </View>

        {/* Last Tick Received */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderRow}>
              <Radio size={18} color="#0284C7" />
              <Text style={styles.cardTitle}>Último Tick Telemétrico</Text>
            </View>
            <Text style={styles.relativeTickTime}>
              {lastTick ? formatRelativeTime(lastTick.measuredAt) : 'Esperando tick...'}
            </Text>
          </View>

          {lastTick ? (
            <View style={styles.tickDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Lote emisor:</Text>
                <Text style={styles.detailValue}>{lastTick.plotName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Humedad reportada:</Text>
                <Text style={[styles.detailValue, { color: '#059669' }]}>
                  {lastTick.moisture}%
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Timestamp sensor:</Text>
                <Text style={styles.detailValueCode}>
                  {new Date(lastTick.measuredAt).toLocaleTimeString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ID Lote:</Text>
                <Text style={styles.detailValueCode} numberOfLines={1}>
                  {lastTick.plotId}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noTickText}>
              Aguardando telemetría del simulador / worker de Redpanda...
            </Text>
          )}
        </View>

        {/* User & Organization Session */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderRow}>
              <User size={18} color="#059669" />
              <Text style={styles.cardTitle}>Sesión y Permisos Activos</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Usuario autenticado:</Text>
            <Text style={styles.detailValue}>{user?.email || 'Anónimo'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Nombre completo:</Text>
            <Text style={styles.detailValue}>{user?.fullName || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Rol asignado:</Text>
            <Text style={[styles.detailValue, { textTransform: 'capitalize', color: '#0284C7' }]}>
              {role}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Organización:</Text>
            <Text style={styles.detailValue}>{organization?.name || 'Estancia Didáctica Concordia'}</Text>
          </View>
        </View>

        {/* Streaming Architecture Pipeline Overview */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderRow}>
              <Layers size={18} color="#7C3AED" />
              <Text style={styles.cardTitle}>Arquitectura del Pipeline</Text>
            </View>
          </View>

          <View style={styles.pipelineStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Simulador IoT (Node.js)</Text>
              <Text style={styles.stepDesc}>
                Emite ticks a los topics Kafka 'soil.moisture' y 'weather.tick' cada 5s. (Monte A pausado para semáforo stale).
              </Text>
            </View>
          </View>

          <View style={styles.pipelineStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Redpanda Broker (Docker)</Text>
              <Text style={styles.stepDesc}>
                Broker de eventos de baja latencia 100% compatible con Kafka API.
              </Text>
            </View>
          </View>

          <View style={styles.pipelineStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Worker de Ingestión & Riego</Text>
              <Text style={styles.stepDesc}>
                Consume mensajes y persiste en Supabase vía service_role. Aplica comandos de riego en &lt; 5s.
              </Text>
            </View>
          </View>

          <View style={styles.pipelineStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumText}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Supabase Realtime & RLS</Text>
              <Text style={styles.stepDesc}>
                Transmite cambios de lecturas, válvulas y comandos a la app móvil Expo en tiempo real vía WebSockets.
              </Text>
            </View>
          </View>
        </View>
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
  },
  lagValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lagBigNumber: {
    fontSize: 42,
    fontWeight: '900',
  },
  lagUnitGroup: {
    flex: 1,
  },
  lagUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  lagExplanation: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  relativeTickTime: {
    fontSize: 11,
    color: '#64748B',
  },
  tickDetails: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  detailValueCode: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#334155',
  },
  noTickText: {
    color: '#94A3B8',
    fontStyle: 'italic',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 10,
  },
  pipelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
});
