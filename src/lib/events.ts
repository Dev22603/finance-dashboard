import { EventEmitter } from "events";

const globalForEvents = globalThis as typeof globalThis & { domainEvents?: EventEmitter };

export const domainEvents: EventEmitter =
	globalForEvents.domainEvents ?? new EventEmitter();

if (process.env.NODE_ENV !== "production") {
	globalForEvents.domainEvents = domainEvents;
}
