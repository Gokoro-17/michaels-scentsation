import { handleRequest } from '../../../server/store.ts';
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };
Deno.serve((req: Request) =>
  handleRequest(req, Deno.env.toObject(), (promise) =>
    EdgeRuntime.waitUntil(promise),
  ),
);
