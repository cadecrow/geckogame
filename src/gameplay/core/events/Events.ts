import * as THREE from "three";
import type { GameMode } from "../../GameManager";
import type { EntityId } from "../entity/Entity";

// Defines the registry of all game events.
// Map event names to their payload types.
export interface EventRegistry {
	// --- CONTROLLER COMMANDS ---
	change_game_mode_command: { gameMode: GameMode };
	player_move_command: {
		command: "MOVE_START" | "MOVE_END";
		direction: "FORWARD" | "BACKWARD" | "LEFT" | "RIGHT";
	};
	player_jump_command: void;
	player_stop_command: void;
	wall_selection_command: {
		position: THREE.Vector3;
		normal: THREE.Vector3;
	};
	update_physics_orientation_command: {
		quaternion: THREE.Quaternion;
	};

	// --- INTERNAL EVENT REQUESTS ---
	entity_render_init_request: { entityId: EntityId };
	entity_physics_init_request: { entityId: EntityId };

	// --- INTERNAL STATUS EVENTS ---
	entity_model_load_error: { entityId: EntityId; error: Error };
	entity_model_load_success: {
		entityId: EntityId;
		model: THREE.Group;
		animations: THREE.AnimationClip[];
	};
	entity_disposed: { entityId: EntityId };
	physics_engine_initialized: void;

	// --- STATE CHANGES ---
	entity_physics_transform_updated: {
		entityId: EntityId;
		position: THREE.Vector3;
		quaternion: THREE.Quaternion;
	};
	entity_force_vector_updated: {
		entityId: EntityId;
		prev: THREE.Vector3;
		curr: THREE.Vector3;
	};

	game_mode_updated: { prev: GameMode; curr: GameMode };
}

export type EventName = keyof EventRegistry;

export type EventCallback<T extends keyof EventRegistry> =
	EventRegistry[T] extends void
		? () => void // If payload is void, callback takes no arguments
		: (payload: EventRegistry[T]) => void; // Otherwise, callback takes payload argument
