import { createClient } from '@supabase/supabase-js';
import { Kafka, Consumer, logLevel } from 'kafkajs';

const BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9094').split(',');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const COMMAND_POLL_INTERVAL_MS = parseInt(process.env.COMMAND_POLL_INTERVAL_MS || '1500', 10);

console.log('[Worker] Starting AgroPulse Worker...');
console.log(`[Worker] Connecting to Supabase at: ${SUPABASE_URL}`);
console.log(`[Worker] Brokers: ${BROKERS.join(', ')}`);

// Create Supabase Admin client with service_role privileges
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Kafka Consumer Setup
const kafka = new Kafka({
  clientId: 'agropulse-worker',
  brokers: BROKERS,
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 1000,
    retries: 10,
  },
});

let consumer: Consumer | null = null;
let isConsumerConnected = false;

async function initKafkaConsumer() {
  consumer = kafka.consumer({ groupId: 'agropulse-worker-group' });

  try {
    console.log(`[Worker] Connecting Kafka Consumer to ${BROKERS.join(', ')}...`);
    await consumer.connect();
    await consumer.subscribe({ topics: ['soil.moisture', 'weather.tick'], fromBeginning: false });
    isConsumerConnected = true;
    console.log('[Worker] Subscribed to topics: soil.moisture, weather.tick');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const raw = message.value?.toString();
        if (!raw) return;

        try {
          const payload = JSON.parse(raw);
          if (topic === 'soil.moisture') {
            await handleSoilMoisture(payload);
          } else if (topic === 'weather.tick') {
            // Log weather telemetry if needed
          }
        } catch (err: any) {
          console.error(`[Worker] Error processing message from ${topic}:`, err.message);
        }
      },
    });
  } catch (err: any) {
    console.warn(`[Worker] Kafka consumer connection warning (${err.message}). Retrying in 5 seconds...`);
    isConsumerConnected = false;
    setTimeout(initKafkaConsumer, 5000);
  }
}

// Ingest telemetry into Supabase readings table
async function handleSoilMoisture(reading: {
  station_id: string;
  plot_id: string;
  moisture_pct: number;
  temperature_c: number;
  battery_pct: number;
  measured_at: string;
}) {
  const { data, error } = await supabase.from('readings').insert({
    station_id: reading.station_id,
    plot_id: reading.plot_id,
    moisture_pct: reading.moisture_pct,
    temperature_c: reading.temperature_c,
    battery_pct: reading.battery_pct,
    measured_at: reading.measured_at,
  }).select('id');

  if (error) {
    console.error(`[Worker] Failed inserting reading into Supabase: ${error.message}`);
  } else {
    console.log(`[Worker] Ingested reading for Plot ${reading.plot_id}: ${reading.moisture_pct}% moisture at ${reading.measured_at}`);
  }
}

// Irrigation Command Processor (Happy path & physical actuator simulation)
let isProcessingCommands = false;

async function processPendingIrrigationCommands() {
  if (isProcessingCommands) return;
  isProcessingCommands = true;

  try {
    // 1. Fetch pending commands
    const { data: commands, error } = await supabase
      .from('irrigation_commands')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);

    if (error) {
      // Ignore network errors during boot
      return;
    }

    if (commands && commands.length > 0) {
      for (const cmd of commands) {
        console.log(`[Worker] >>> Processing irrigation command [${cmd.id}] for valve [${cmd.valve_id}]: Action='${cmd.action}', clientRequestId='${cmd.client_request_id}'`);

        // Simulate physical valve actuation latency (1.2 seconds)
        await new Promise((r) => setTimeout(r, 1200));

        const now = new Date().toISOString();

        // 2. Update valve state to 'open' or 'closed'
        const targetStatus = cmd.action === 'open' ? 'open' : 'closed';
        const { error: valveError } = await supabase
          .from('valves')
          .update({
            status: targetStatus,
            last_command_at: now,
          })
          .eq('id', cmd.valve_id);

        if (valveError) {
          console.error(`[Worker] Failed updating valve ${cmd.valve_id}: ${valveError.message}`);
          await supabase
            .from('irrigation_commands')
            .update({
              status: 'failed',
              error_message: `Physical actuation failure: ${valveError.message}`,
              executed_at: now,
            })
            .eq('id', cmd.id);
          continue;
        }

        // 3. Mark command as 'applied'
        const { error: cmdError } = await supabase
          .from('irrigation_commands')
          .update({
            status: 'applied',
            executed_at: now,
          })
          .eq('id', cmd.id);

        if (cmdError) {
          console.error(`[Worker] Failed marking command as applied: ${cmdError.message}`);
        } else {
          console.log(`[Worker] <<< Command [${cmd.id}] successfully APPLIED in ~1.5s! Valve [${cmd.valve_id}] is now '${cmd.action}'.`);
        }
      }
    }
  } catch (err: any) {
    console.error(`[Worker] Error in irrigation command loop: ${err.message}`);
  } finally {
    isProcessingCommands = false;
  }
}

// Start Kafka consumer and Command loop
initKafkaConsumer();
setInterval(processPendingIrrigationCommands, COMMAND_POLL_INTERVAL_MS);

console.log(`[Worker] Command actuator active (polling every ${COMMAND_POLL_INTERVAL_MS}ms).`);
