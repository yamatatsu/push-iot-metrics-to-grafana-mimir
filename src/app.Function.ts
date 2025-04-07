import { getParameter } from "@aws-lambda-powertools/parameters/ssm";
import { ValueType } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import * as v from 'valibot';

const mqttPayloadSchema = v.object({
  deviceId: v.string(),
  label: v.string(),
  value: v.number(),
});
const secretSchema = v.object({
  endpoint: v.string(),
  token: v.string(),
});

export const handler = async (event: unknown) => {
  const payload = v.parse(mqttPayloadSchema, event);

  const rawSecret = await getParameter("/grafana/otel/secrets", {
    transform: "json",
    decrypt: true,
    maxAge: 10 * 60, // seconds
  });
  const secret = v.parse(secretSchema, rawSecret)


  const meterProvider = new MeterProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "test_service",
    }),
    readers: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          /**
           * OTELエンドポイント(`https://${host}/otlp`)に加えて、
           * MimirのAPIリファレンスに記載されているOTELのpath(`/otlp/v1/metrics`)を合わせて指定する
           * @see https://grafana.com/docs/mimir/latest/references/http-api/#otlp
           */
          url: `${secret.endpoint}/v1/metrics`,
          headers: {
            Authorization: `Basic ${secret.token}`,
          },
        }),
        exportIntervalMillis: 1000,
      }),
    ],
  });
  const meter = meterProvider.getMeter("test", "1.0.0");

  const inputGauge = meter.createGauge(`test_service_${payload.label}`, {
    valueType: ValueType.DOUBLE,
  });

  inputGauge.record(payload.value, {
    deviceId: payload.deviceId,
  });

  await meterProvider.shutdown();
}