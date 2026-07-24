import type {
  AiTelemetryEvent,
  AiTelemetryReporter,
} from '../../application/ports/AiTelemetryReporter.js';

export class ConsoleAiTelemetryReporter implements AiTelemetryReporter {
  async record(event: AiTelemetryEvent): Promise<void> {
    console.warn('ai.telemetry', event);
  }
}
