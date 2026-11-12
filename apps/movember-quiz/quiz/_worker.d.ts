import type { WorkerEnvironment } from '../server/src/contracts.ts';

declare const handler: {
    fetch(request: Request, environment: WorkerEnvironment): Promise<Response>;
};
export default handler;
