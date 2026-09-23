import http from 'http';
import { Kafka, Producer, logLevel } from 'kafkajs';

const BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9094').split(',');
const TICK_INTERVAL_MS = (parseInt(process.env.TICK_INTERVAL_SEC || '5', 10)) * 1000;
const HTTP_PORT = parseInt(process.env.SIMULATOR_PORT || '4000', 10);

// Initialize paused plot set (defaults to Monte A for stale demonstration)
const pausedPlots = new Set<string>(
  (process.env.PAUSED_PLOT_IDS || '22222222-2222-2222-2222-222222222223')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
);

interface StationDef {
  stationId: string;
  plotId: string;
  hardwareId: string;
  name: string;
  baseMoisture: number;
  baseTemp: number;
  fluctuation: number;
}

const STATIONS: StationDef[] = [
  {
    stationId: '33333333-3333-3333-3333-333333333331',
    plotId: '22222222-2222-2222-2222-222222222221',
    hardwareId: 'ST-CONC-01',
    name: 'Estación Costa 1',
    baseMoisture: 35.0, // Optimal
    baseTemp: 23.0,
    fluctuation: 1.5,
  },
  {
    stationId: '33333333-3333-3333-3333-333333333332',
    plotId: '22222222-2222-2222-2222-222222222222',
    hardwareId: 'ST-CONC-02',
    name: 'Estación Costa 2',
    baseMoisture: 18.0, // Dry (< 25%)
    baseTemp: 27.5,
    fluctuation: 1.0,
  },
  {
    stationId: '33333333-3333-3333-3333-333333333333',
    plotId: '22222222-2222-2222-2222-222222222223',
    hardwareId: 'ST-CONC-03',
    name: 'Estación Monte A',
    baseMoisture: 30.0, // Stale if paused
    baseTemp: 25.0,
    fluctuation: 1.2,
  },
];

const kafka = new Kafka({
  clientId: 'agropulse-simulator',
  brokers: BROKERS,
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 1000,
    retries: 10,
  },
});

let producer: Producer | null = null;
let isConnected = false;

async function initKafkaProducer() {
  producer = kafka.producer();
  try {
    console.log(`[Simulator] Connecting to Redpanda broker at ${BROKERS.join(', ')}...`);
    await producer.connect();
    isConnected = true;
    console.log('[Simulator] Connected to Redpanda successfully.');
  } catch (err: any) {
    console.warn(`[Simulator] Could not connect to Redpanda broker (${err.message}). Simulator will run in stand-by retry mode.`);
    isConnected = false;
    setTimeout(initKafkaProducer, 5000);
  }
}

// Generate realistic telemetry tick
function generateStationReading(station: StationDef) {
  const noise = (Math.random() - 0.5) * station.fluctuation;
  const moisture = Math.max(5, Math.min(99, +(station.baseMoisture + noise).toFixed(1)));
  const temp = +(station.baseTemp + (Math.random() - 0.5) * 0.8).toFixed(1);
  const battery = +(95 + (Math.random() - 0.5) * 4).toFixed(1);

  return {
    station_id: station.stationId,
    plot_id: station.plotId,
    hardware_id: station.hardwareId,
    moisture_pct: moisture,
    temperature_c: temp,
    battery_pct: battery,
    measured_at: new Date().toISOString(),
  };
}

function generateWeatherReading() {
  return {
    organization_id: '11111111-1111-1111-1111-111111111111',
    ambient_temperature_c: +(24.0 + (Math.random() - 0.5) * 2).toFixed(1),
    relative_humidity_pct: +(60.0 + (Math.random() - 0.5) * 5).toFixed(1),
    wind_speed_kmh: +(12.0 + Math.random() * 6).toFixed(1),
    solar_radiation_wm2: +(750.0 + (Math.random() - 0.5) * 40).toFixed(1),
    measured_at: new Date().toISOString(),
  };
}

async function emitTicks() {
  const now = new Date().toLocaleTimeString();

  // 1. Emit soil moisture ticks
  for (const station of STATIONS) {
    if (pausedPlots.has(station.plotId)) {
      // Intentionally skip to simulate stale state
      console.log(`[Simulator] [${now}] Plot ${station.name} (${station.plotId}) is PAUSED -> Simulating stale state.`);
      continue;
    }

    const payload = generateStationReading(station);

    if (isConnected && producer) {
      try {
        await producer.send({
          topic: 'soil.moisture',
          messages: [
            {
              key: station.plotId,
              value: JSON.stringify(payload),
            },
          ],
        });
        console.log(`[Simulator] [${now}] Emitted soil.moisture for ${station.name}: ${payload.moisture_pct}% moisture, ${payload.temperature_c}°C`);
      } catch (err: any) {
        console.error(`[Simulator] Error emitting to topic soil.moisture: ${err.message}`);
        isConnected = false;
        initKafkaProducer();
      }
    } else {
      console.log(`[Simulator] [Local-Log] [${now}] Reading generated for ${station.name}: ${payload.moisture_pct}% (Waiting for Redpanda broker)`);
    }
  }

  // 2. Emit weather tick
  const weather = generateWeatherReading();
  if (isConnected && producer) {
    try {
      await producer.send({
        topic: 'weather.tick',
        messages: [{ value: JSON.stringify(weather) }],
      });
    } catch {
      // Ignored for weather retry
    }
  }
}

// Lightweight HTTP Control Server for dynamic stale toggling
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || '/';

  if (url === '/status' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      broker: BROKERS,
      connected: isConnected,
      tickIntervalMs: TICK_INTERVAL_MS,
      stations: STATIONS,
      pausedPlots: Array.from(pausedPlots),
    }));
    return;
  }

  if (url.startsWith('/pause/') && req.method === 'POST') {
    const plotId = url.replace('/pause/', '').trim();
    pausedPlots.add(plotId);
    console.log(`[Simulator HTTP] Paused ticks for plotId: ${plotId}`);
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: `Plot ${plotId} paused. Stale simulation active.`, pausedPlots: Array.from(pausedPlots) }));
    return;
  }

  if (url.startsWith('/resume/') && req.method === 'POST') {
    const plotId = url.replace('/resume/', '').trim();
    pausedPlots.delete(plotId);
    console.log(`[Simulator HTTP] Resumed ticks for plotId: ${plotId}`);
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: `Plot ${plotId} resumed. Telemetry active.`, pausedPlots: Array.from(pausedPlots) }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Endpoint not found. Use GET /status, POST /pause/:plotId, POST /resume/:plotId' }));
});

// Start loop
initKafkaProducer();
setInterval(emitTicks, TICK_INTERVAL_MS);

server.listen(HTTP_PORT, () => {
  console.log(`[Simulator HTTP] Control server running at http://0.0.0.0:${HTTP_PORT}`);
  console.log(`[Simulator] Ticks will emit every ${TICK_INTERVAL_MS / 1000}s. Paused plots: [${Array.from(pausedPlots).join(', ')}]`);
});
