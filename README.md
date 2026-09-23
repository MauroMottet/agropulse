# AgroPulse 🌾💧
**Monitoreo Hídrico, Telemetría IoT y Riego Inteligente**
Estancia Didáctica Concordia • Entre Ríos, Argentina

---

## 🚀 Inicio Rápido

### 1. Base de Datos (Supabase)
En el **SQL Editor** de Supabase, ejecuta en orden:
1. [`supabase/migrations/01_schema.sql`](supabase/migrations/01_schema.sql)
2. [`supabase/seed.sql`](supabase/seed.sql)

### 2. Backend y Broker (Docker)
Levanta Redpanda, el simulador de telemetría y el worker:
```bash
npm run docker:up
```

### 3. App Móvil (Expo)
```bash
# Iniciar en navegador web:
npm run start:app:web

# Iniciar para celular (Expo Go / Android / iOS):
npm run start:app
```

---

## 👥 Usuarios Demo (1-Tap Login)

| Rol | Correo | Contraseña | Permisos |
| :--- | :--- | :--- | :--- |
| **Productor** | `productor@agropulse.test` | `AgroPulse2026!` | Control total de válvulas y umbrales |
| **Operador** | `operador@agropulse.test` | `AgroPulse2026!` | Operación de riego y telemetría |
| **Asesor** | `asesor@agropulse.test` | `AgroPulse2026!` | Solo lectura (RLS restringido) |

---

## 🚦 Semáforo de Lotes (Concordia)

- **Costa 1 (Citrus):** 🟢 **Verde** (Óptimo, ~34% humedad).
- **Costa 2 (Citrus):** 🔴 **Rojo** (Seco, < 25% humedad) ➔ Requiere riego.
- **Monte A (Soja):** ⚪ **Gris** (Stale, última lectura > 15 min).

---

## 📁 Estructura del Proyecto

- `apps/agropulse/`: App móvil en React Native con Expo Router y TypeScript.
- `infra/`: Broker Redpanda (Kafka), Simulador IoT y Worker consumidor en Docker.
- `supabase/`: Migraciones SQL, políticas RLS, Realtime y datos semilla.
