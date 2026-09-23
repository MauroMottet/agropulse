import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { UserRole } from '../../src/types/database';
import { Sprout, ShieldCheck, Wrench, BookOpen, AlertCircle, ArrowRight } from 'lucide-react-native';

export default function LoginScreen() {
  const { login, loginAs, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleStandardLogin() {
    if (!email) {
      setErrorMsg('Ingresa un correo electrónico.');
      return;
    }
    setErrorMsg(null);
    const result = await login(email, password);
    if (result.success) {
      router.replace('/(tabs)/map');
    } else {
      setErrorMsg(result.error || 'Credenciales inválidas.');
    }
  }

  async function handleDemoRoleLogin(role: UserRole) {
    setErrorMsg(null);
    await loginAs(role);
    router.replace('/(tabs)/map');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoWrap}>
            <Sprout size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>AgroPulse</Text>
          <Text style={styles.brandSubtitle}>
            Gestión Hídrica & Telemetría IoT en Tiempo Real
          </Text>
          <View style={styles.locationTag}>
            <Text style={styles.locationText}>Estancia Didáctica • Concordia, Entre Ríos</Text>
          </View>
        </View>

        {/* Demo Fast Access Section */}
        <View style={styles.demoCard}>
          <Text style={styles.demoSectionTitle}>Acceso Rápido para Evaluación (1-Tap):</Text>

          {/* Producer Button */}
          <TouchableOpacity
            style={[styles.roleBtn, styles.producerBorder]}
            onPress={() => handleDemoRoleLogin('producer')}
            disabled={isLoading}
          >
            <View style={[styles.roleIcon, { backgroundColor: '#ECFDF5' }]}>
              <ShieldCheck size={20} color="#059669" />
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleName}>Carlos Productor</Text>
              <Text style={styles.roleDesc}>Control total de válvulas y umbrales</Text>
            </View>
            <ArrowRight size={16} color="#059669" />
          </TouchableOpacity>

          {/* Operator Button */}
          <TouchableOpacity
            style={[styles.roleBtn, styles.operatorBorder]}
            onPress={() => handleDemoRoleLogin('operator')}
            disabled={isLoading}
          >
            <View style={[styles.roleIcon, { backgroundColor: '#EFF6FF' }]}>
              <Wrench size={20} color="#2563EB" />
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleName}>Lucía Operadora</Text>
              <Text style={styles.roleDesc}>Operación de riego y telemetría</Text>
            </View>
            <ArrowRight size={16} color="#2563EB" />
          </TouchableOpacity>

          {/* Advisor Button */}
          <TouchableOpacity
            style={[styles.roleBtn, styles.advisorBorder]}
            onPress={() => handleDemoRoleLogin('advisor')}
            disabled={isLoading}
          >
            <View style={[styles.roleIcon, { backgroundColor: '#FFFBEB' }]}>
              <BookOpen size={20} color="#D97706" />
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleName}>Martín Asesor Agronómico</Text>
              <Text style={styles.roleDesc}>Solo lectura (RLS restringido)</Text>
            </View>
            <ArrowRight size={16} color="#D97706" />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o ingresa con credenciales</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Form Inputs */}
        <View style={styles.formCard}>
          {errorMsg && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color="#DC2626" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Correo Electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="productor@agropulse.test"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.inputLabel}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleStandardLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  locationTag: {
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.4)',
  },
  locationText: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '600',
  },
  demoCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  demoSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  producerBorder: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  operatorBorder: {
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  advisorBorder: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  roleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  roleDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    fontSize: 12,
    color: '#64748B',
    marginHorizontal: 10,
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    fontSize: 12,
    color: '#FCA5A5',
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
