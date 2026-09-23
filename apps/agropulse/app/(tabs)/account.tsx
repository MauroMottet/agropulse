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
import { useAuth } from '../../src/context/AuthContext';
import { UserRole } from '../../src/types/database';
import {
  User,
  LogOut,
  Building,
  ShieldCheck,
  Wrench,
  BookOpen,
  Check,
  X,
  RefreshCw,
} from 'lucide-react-native';

export default function AccountScreen() {
  const { user, role, organization, logout, loginAs } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  async function handleSwitchRole(newRole: UserRole) {
    await loginAs(newRole);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mi Cuenta & Perfil</Text>
          <Text style={styles.subtitle}>
            Gestión de identidad, roles y permisos de acceso
          </Text>
        </View>

        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <User size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.userName}>{user?.fullName || 'Usuario'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'sin-correo@agropulse.test'}</Text>

          <View style={styles.orgTag}>
            <Building size={14} color="#059669" />
            <Text style={styles.orgText}>
              {organization?.name || 'Estancia Didáctica Concordia'}
            </Text>
          </View>
        </View>

        {/* Permissions Matrix */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Permisos Asignados al Rol Actual</Text>
          <Text style={styles.roleBadgeText}>
            Rol Activo: <Text style={{ textTransform: 'capitalize', color: '#059669' }}>{role}</Text>
          </Text>

          <View style={styles.permissionList}>
            {/* Visualización */}
            <View style={styles.permissionItem}>
              <View style={styles.permIconCheck}>
                <Check size={14} color="#059669" />
              </View>
              <View style={styles.permTextGroup}>
                <Text style={styles.permName}>Lectura de Mapa y Telemetría</Text>
                <Text style={styles.permDesc}>Acceso a lecturas de sensores y semáforo en tiempo real</Text>
              </View>
            </View>

            {/* Ajuste de umbrales */}
            <View style={styles.permissionItem}>
              <View style={role === 'advisor' ? styles.permIconCross : styles.permIconCheck}>
                {role === 'advisor' ? <X size={14} color="#DC2626" /> : <Check size={14} color="#059669" />}
              </View>
              <View style={styles.permTextGroup}>
                <Text style={styles.permName}>Modificación de Umbrales Hídricos</Text>
                <Text style={styles.permDesc}>
                  {role === 'advisor'
                    ? 'Bloqueado por RLS para Asesores'
                    : 'Permitido para Productores y Operadores'}
                </Text>
              </View>
            </View>

            {/* Control de válvulas */}
            <View style={styles.permissionItem}>
              <View style={role === 'advisor' ? styles.permIconCross : styles.permIconCheck}>
                {role === 'advisor' ? <X size={14} color="#DC2626" /> : <Check size={14} color="#059669" />}
              </View>
              <View style={styles.permTextGroup}>
                <Text style={styles.permName}>Accionamiento de Válvulas de Riego</Text>
                <Text style={styles.permDesc}>
                  {role === 'advisor'
                    ? 'Solo lectura: comandos deshabilitados'
                    : 'Emisión de comandos con idempotencia (RF-16)'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Role Switcher (For Evaluation and Testing) */}
        <View style={styles.card}>
          <View style={styles.switchHeader}>
            <RefreshCw size={16} color="#0284C7" />
            <Text style={styles.cardTitle}>Cambiar de Usuario de Prueba</Text>
          </View>
          <Text style={styles.switchDesc}>
            Cambia rápidamente entre roles para verificar las políticas RLS y la interfaz:
          </Text>

          <View style={styles.switchButtonGroup}>
            <TouchableOpacity
              style={[styles.switchBtn, role === 'producer' && styles.switchBtnActive]}
              onPress={() => handleSwitchRole('producer')}
            >
              <ShieldCheck size={16} color={role === 'producer' ? '#FFFFFF' : '#059669'} />
              <Text style={[styles.switchBtnText, role === 'producer' && styles.switchBtnTextActive]}>
                Productor
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.switchBtn, role === 'operator' && styles.switchBtnActive]}
              onPress={() => handleSwitchRole('operator')}
            >
              <Wrench size={16} color={role === 'operator' ? '#FFFFFF' : '#2563EB'} />
              <Text style={[styles.switchBtnText, role === 'operator' && styles.switchBtnTextActive]}>
                Operador
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.switchBtn, role === 'advisor' && styles.switchBtnActive]}
              onPress={() => handleSwitchRole('advisor')}
            >
              <BookOpen size={16} color={role === 'advisor' ? '#FFFFFF' : '#D97706'} />
              <Text style={[styles.switchBtnText, role === 'advisor' && styles.switchBtnTextActive]}>
                Asesor
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
        </TouchableOpacity>
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
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  orgTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 12,
  },
  orgText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
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
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleBadgeText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  permissionList: {
    gap: 10,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  permIconCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  permIconCross: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  permTextGroup: {
    flex: 1,
  },
  permName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  permDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  switchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  switchDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  switchButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  switchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 10,
  },
  switchBtnActive: {
    backgroundColor: '#0F172A',
  },
  switchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  switchBtnTextActive: {
    color: '#FFFFFF',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
});
