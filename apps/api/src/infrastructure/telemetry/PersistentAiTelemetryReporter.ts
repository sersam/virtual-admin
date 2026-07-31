import type { Clock } from '../../application/ports/Clock.js';
import type { AiTelemetryEventRepository } from '../../application/ports/AiTelemetryEventRepository.js';
import type {
  AiTelemetryEvent,
  AiTelemetryReporter,
} from '../../application/ports/AiTelemetryReporter.js';
import { ConsoleAiTelemetryReporter } from '../openai/ConsoleAiTelemetryReporter.js';

interface PersistentAiTelemetryReporterDependencies {
  readonly clock: Clock;
  readonly consoleReporter?: AiTelemetryReporter;
  readonly repository: AiTelemetryEventRepository;
}

export class PersistentAiTelemetryReporter implements AiTelemetryReporter {
  constructor(private readonly dependencies: PersistentAiTelemetryReporterDependencies) {}

  async record(event: AiTelemetryEvent): Promise<void> {
    await Promise.allSettled([this.log(event), this.persist(event)]);
  }

  private async log(event: AiTelemetryEvent): Promise<void> {
    await (this.dependencies.consoleReporter ?? new ConsoleAiTelemetryReporter()).record(event);
  }

  private async persist(event: AiTelemetryEvent): Promise<void> {
    await this.dependencies.repository.record({
      ...event,
      occurredAt: this.dependencies.clock.now(),
      provider: event.provider ?? 'openai',
    });
  }
}
