import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Valve, IrrigationCommand, UserRole } from '../types/database';
import { Droplet, Power, ShieldAlert, CheckCircle2, Clock } from 'lucide-react-native';
import { formatRelativeTime } from '../utils/geo';

interface ValveControlCardProps {
  valve?: Valve;
  activeCommand?: IrrigationCommand;
  userRole: UserRole;
  plotId: string;
  onSendCommand: (plotId: string, action: 'open' | 'close') => Promise<{ success: boolean; elapsedMs?: number; error?: string }>;
}

export const ValveControlCard: React.FC<ValveControlCardProps> = ({
  valve,
  activeCommand,
  userRole,
  plotId,
  onSendCommand,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  if (!valve) {
    return (
      <View style={styles.card}>
        <Text style={styles.noValveText}>No hay válvula asignada a este lote.</Text>
      </View>
    );
  }

  const isPending = activeCommand?.status === 'pending' || isSubmitting;
  const isOpen = valve.status === 'open';
  const isAdvisor = userRole === 'advisor';

  async function handleToggle() {
    if (isPending || isAdvisor) return;

    const nextAction: 'open' | 'close' = isOpen ? 'close' : 'open';
    setIsSubmitting(true);
    setFeedback(null);

    const result = await onSendCommand(plotId, nextAction);
    setIsSubmitting(false);

    if (result.success) {
      const elapsed = result.elapsedMs ? ` en ${(result.elapsedMs / 1000).toFixed(1)}s` : '';
      setFeedback({
        message: nextAction === 'open' ? `Riego activado con éxito${elapsed}!` : `Riego detenido con éxito${elapsed}!`,
      });
      setTimeout(() => setFeedback(null), 6000);
    } else {
      setFeedback({
        message: result.error || 'No se pudo ejecutar el comando de riego.',
        isError: true,
      });
      setTimeout(() => setFeedback(null), 8000);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconCircle, { backgroundColor: isOpen ? '#DBEAFE' : '#F1F5F9' }]}>
            <Droplet size={20} color={isOpen ? '#2563EB' : '#64748B'} />
          </View>
          <View>
            <Text style={styles.title}>{valve.name}</Text>
            <Text style={styles.subtitle}>
              Última acción: {formatRelativeTime(valve.last_command_at || undefined)}
            </Text>
          </View>
        </View>

        {/* State Badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isOpen ? '#EFF6FF' : '#F8FAFC', borderColor: isOpen ? '#93C5FD' : '#CBD5E1' },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOpen ? '#2563EB' : '#64748B' },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: isOpen ? '#1D4ED8' : '#475569' },
            ]}
          >
            {isOpen ? 'ABIERTA' : 'CERRADA'}
          </Text>
        </View>
      </View>

      {/* Advisor read-only disclaimer */}
      {isAdvisor && (
        <View style={styles.roleWarningBox}>
          <ShieldAlert size={16} color="#B45309" />
          <Text style={styles.roleWarningText}>
            Modo Solo Lectura: Como Asesor no tienes permisos para accionar válvulas.
          </Text>
        </View>
      )}

      {/* RF-16: Active command pending state indicator */}
      {isPending && (
        <View style={styles.pendingBox}>
          <ActivityIndicator size="small" color="#0284C7" />
          <Text style={styles.pendingText}>
            Comando en curso... Sincronizando con actuador físico (RF-16 Idempotencia)
          </Text>
        </View>
      )}

      {/* Feedback banner */}
      {feedback && (
        <View
          style={[
            styles.feedbackBanner,
            { backgroundColor: feedback.isError ? '#FEF2F2' : '#ECFDF5', borderColor: feedback.isError ? '#FCA5A5' : '#6EE7B7' },
          ]}
        >
          {feedback.isError ? (
            <ShieldAlert size={16} color="#DC2626" />
          ) : (
            <CheckCircle2 size={16} color="#059669" />
          )}
          <Text
            style={[
              styles.feedbackText,
              { color: feedback.isError ? '#B91C1C' : '#047857' },
            ]}
          >
            {feedback.message}
          </Text>
        </View>
      )}

      {/* Action Button */}
      <TouchableOpacity
        style={[
          styles.actionButton,
          isOpen ? styles.btnStop : styles.btnStart,
          (isPending || isAdvisor) && styles.btnDisabled,
        ]}
        onPress={handleToggle}
        disabled={isPending || isAdvisor}
        activeOpacity={0.8}
      >
        {isPending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Power size={18} color="#FFFFFF" />
        )}
        <Text style={styles.actionBtnText}>
          {isPending
            ? 'Enviando comando...'
            : isOpen
            ? 'Detener Riego (Cerrar Válvula)'
            : 'Iniciar Riego (Abrir Válvula)'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  roleWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  roleWarningText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    fontWeight: '500',
  },
  pendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  pendingText: {
    fontSize: 12,
    color: '#0369A1',
    flex: 1,
    fontWeight: '600',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnStart: {
    backgroundColor: '#059669',
  },
  btnStop: {
    backgroundColor: '#DC2626',
  },
  btnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  noValveText: {
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
