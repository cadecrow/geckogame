import { type EventRegistry, type EventCallback } from "./Events";

// Gecko mode is considered state where we are selecting a new orientation
// once we enter the new orientation and are back to moving around, we are no longer in gecko mode

const LOG_EVENTS =
	import.meta.env.VITE_RUNTIME_ENV === "DEV" ||
	import.meta.env.VITE_RUNTIME_ENV === "TEST" ||
	false;

export class EventBus {
	private listeners: Map<
		keyof EventRegistry,
		Set<EventCallback<keyof EventRegistry>>
	>;

	constructor() {
		this.listeners = new Map();
	}

	public destroy(): void {
		this.listeners.clear();
	}

	public emit<K extends keyof EventRegistry>(
		event: K,
		payload: EventRegistry[K],
		logEvent: boolean = LOG_EVENTS
	): void {
		if (logEvent) {
			console.log("Emitting event:", event, payload);
		}
		const callbacks = this.listeners.get(event);
		if (callbacks) {
			callbacks.forEach((callback) => callback(payload));
		}
	}

	public on<K extends keyof EventRegistry>(
		event: K,
		callback: EventCallback<K>,
		logEvent: boolean = LOG_EVENTS
	): void {
		if (logEvent) {
			console.log("Registering event callback:", event, callback);
		}
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners
			.get(event)
			?.add(callback as EventCallback<keyof EventRegistry>); // Cast needed due to heterogeneous map
	}

	public off<K extends keyof EventRegistry>(
		event: K,
		callback: EventCallback<K>,
		logEvent: boolean = LOG_EVENTS
	): void {
		if (logEvent) {
			console.log("Unregistering event callback:", event, callback);
		}
		const callbacks = this.listeners.get(event);
		if (callbacks) {
			callbacks.delete(callback as EventCallback<keyof EventRegistry>); // Cast needed due to heterogeneous map
		}
	}

	public once<K extends keyof EventRegistry>(
		event: K,
		callback: EventCallback<K>,
		logEvent: boolean = LOG_EVENTS
	): void {
		// Wrapper that calls the callback and then unregisters itself
		const wrapper = ((payload: EventRegistry[K]) => {
			if (logEvent) {
				console.log("creating once event callback: ", event);
			}
			this.off(event, wrapper as EventCallback<K>);
			// If the callback expects no arguments, call with no args
			if (callback.length === 0) {
				(callback as () => void)();
			} else {
				(callback as (payload: EventRegistry[K]) => void)(payload);
			}
		}) as EventCallback<K>;
		this.on(event, wrapper);
	}

	public clearEvent(event: keyof EventRegistry): void {
		this.listeners.delete(event);
	}
}
