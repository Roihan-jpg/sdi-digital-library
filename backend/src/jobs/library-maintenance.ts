import { loadEnvironment } from '../config/env.js';
import { CirculationService } from '../modules/circulation/circulation.service.js';

const result = await new CirculationService(loadEnvironment()).scheduledMaintenance();
process.stdout.write(`${JSON.stringify(result)}\n`);
