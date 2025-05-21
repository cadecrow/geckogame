import * as THREE from "three";
import type { EntityId } from "./entities/Entity";
import type { GameMode } from "./GameManager";

// Gecko mode is considered state where we are selecting a new orientation
// once we enter the new orientation and are back to moving around, we are no longer in gecko mode

export const EVENT = {
	// --- CONTROLLER COMMANDS ---
	CHANGE_GAME_MODE_COMMAND: "change_game_mode_command",
	PLAYER_MOVE_COMMAND: "player_move_command",
	PLAYER_JUMP_COMMAND: "player_jump_command",
	PLAYER_STOP_COMMAND: "player_stop_command", // stop all movement
	WALL_SELECTION_COMMAND: "wall-selection-command", // Related to Gecko mode target selection
	UPDATE_PHYSICS_ORIENTATION_COMMAND: "update-physics-orientation-command",

	// Internal Event Requests
	ENTITY_MODEL_LOAD_REQUEST: "entity_model_load_request",

	// INTERNAL STATUS EVENTS
	ENTITY_MODEL_LOAD_ERROR: "entity_model_load_error",
	ENTITY_MODEL_LOAD_SUCCESS: "entity_model_load_success",
	ENTITY_DISPOSED: "entity_disposed",
	PHYSICS_ENGINE_INITIALIZED: "physics_engine_initialized",

	// --- STATE CHANGES ---
	ENTITY_PHYSICS_TRANSFORM_UPDATED: "entity_physics_transform_updated",
	ENTITY_FORCE_VECTOR_UPDATED: "entity_force_vector_updated",

	GAME_MODE_UPDATED: "game_mode_updated",
} as const;

// Defines the payload type for each event
export type EventPayloads = {
	// --- CONTROLLER COMMANDS ---
	[EVENT.UPDATE_PHYSICS_ORIENTATION_COMMAND]:
		| { quaternion: THREE.Quaternion; semanticCommand?: never }
		| { quaternion?: never; semanticCommand: "forwardLeft" | "forwardRight" };

	[EVENT.WALL_SELECTION_COMMAND]: {
		position: THREE.Vector3;
		normal: THREE.Vector3;
	};
	[EVENT.CHANGE_GAME_MODE_COMMAND]: {
		gameMode: GameMode;
	};
	[EVENT.PLAYER_MOVE_COMMAND]: {
		command: "MOVE_START" | "MOVE_END";
		direction: "FORWARD" | "BACKWARD" | "LEFT" | "RIGHT";
	};
	[EVENT.PLAYER_JUMP_COMMAND]: null;
	[EVENT.PLAYER_STOP_COMMAND]: null;

	// --- INTERNAL REQUESTS ---
	[EVENT.ENTITY_MODEL_LOAD_REQUEST]: {
		entityId: EntityId;
		modelPath: string;
	};

	// --- INTERNAL STATUS EVENTS ---
	[EVENT.ENTITY_MODEL_LOAD_SUCCESS]: {
		entityId: EntityId;
		model: THREE.Group;
		animations: THREE.AnimationClip[];
	};
	[EVENT.ENTITY_MODEL_LOAD_ERROR]: { entityId: EntityId; error: Error };
	[EVENT.ENTITY_DISPOSED]: { entityId: EntityId };
	[EVENT.PHYSICS_ENGINE_INITIALIZED]: Record<string, never>;

	// --- STATE CHANGES ---
	[EVENT.GAME_MODE_UPDATED]: {
		prev: GameMode;
		curr: GameMode;
	};

	[EVENT.ENTITY_PHYSICS_TRANSFORM_UPDATED]: {
		entityId: EntityId;
		position: THREE.Vector3;
		quaternion: THREE.Quaternion;
	};

	[EVENT.ENTITY_FORCE_VECTOR_UPDATED]: {
		entityId: EntityId;
		prev: THREE.Vector3;
		curr: THREE.Vector3;
	};
}

export type EventKey = keyof typeof EVENT;
export type EventName = (typeof EVENT)[EventKey];
export type EventPayload<E extends EventName> = EventPayloads[E];

// Type for a callback, ensuring args match the event's payload
export type TypedEventCallback<E extends EventName> = (
	args: EventPayload<E>
) => void;

export class EventSystem {
	private eventRegister: Map<EventName, Set<TypedEventCallback<EventName>>>;

	constructor() {
		this.eventRegister = new Map();
	}

	public cleanup(): void {
		this.eventRegister.clear();
	}

	public emit<E extends EventName>(event: E, payload: EventPayload<E>): void {
		const callbacks = this.eventRegister.get(event);
		if (callbacks) {
			callbacks.forEach((callback) => callback(payload));
		}
	}

	public on<E extends EventName>(
		event: E,
		callback: TypedEventCallback<E>
	): void {
		if (!this.eventRegister.has(event)) {
			this.eventRegister.set(event, new Set());
		}
		this.eventRegister
			.get(event)
			?.add(callback as TypedEventCallback<EventName>); // Cast needed due to heterogeneous map
	}

	public onAsync<E extends EventName>(
		event: E,
		callback: TypedEventCallback<E>
	): void {
		this.on(event, async (args) => {
			await callback(args);
		});
	}

	public off<E extends EventName>(
		event: E,
		callback: TypedEventCallback<E>
	): void {
		const callbacks = this.eventRegister.get(event);
		if (callbacks) {
			callbacks.delete(callback as TypedEventCallback<EventName>); // Cast needed due to heterogeneous map
		}
	}

	public once<E extends EventName>(
		event: E,
		callback: TypedEventCallback<E>
	): void {
		const wrapper = (args: EventPayloads[E]) => {
			this.off(event, wrapper);
			callback(args);
		};
		this.on(event, wrapper);
	}

	public clearEvent(event: EventName): void {
		this.eventRegister.delete(event);
	}
}
