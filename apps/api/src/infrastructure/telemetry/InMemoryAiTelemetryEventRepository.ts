import type {
  AiTelemetryEventRepository,
  AiTelemetrySummaryInput,
  PersistedAiTelemetryEvent,
} from '../../application/ports/AiTelemetryEventRepository.js';
import { buildUtcPeriod, buildObservabilityResponse } from './buildObservabilityResponse.js';

export class InMemoryAiTelemetryEventRepository implements AiTelemetryEventRepository {
  private readonly events: PersistedAiTelemetryEvent[] = [];

  async record(event: PersistedAiTelemetryEvent): Promise<void> {
    this.events.push(event);
  }

  async summarizeDay(input: AiTelemetrySummaryInput) {
    const period = buildUtcPeriod(input.day);
    return buildObservabilityResponse(
      this.events.filter(
        (event) => event.occurredAt >= period.startsAt && event.occurredAt < period.endsAt,
      ),
      input,
    );
  }

  listForTest(): readonly PersistedAiTelemetryEvent[] {
    return [...this.events];
  }
}
