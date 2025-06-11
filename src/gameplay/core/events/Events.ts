import * as THREE from "three";
import type { GameMode } from "../../GameManager";
import type { Entity, EntityId } from "../ec-s/Entity";

// Defines the registry of all game events.
// Map event names to their payload types.
export interface EventRegistry {
	// --- debugging events ---
	dummy_mouse_event: { message: string; data: MouseEvent };
	dummy_keyboard_event: { message: string; data: KeyboardEvent };

	// --- COMMANDS --- (usually triggered by user input)
	change_game_mode_command: { gameMode: GameMode };
	player_move_command: {
		command: "MOVE_START" | "MOVE_END" | "START_MODIFY_UP" | "STOP_MODIFY_UP";
		direction: "FORWARD" | "BACKWARD" | "LEFT" | "RIGHT" | "UP";
	};
	player_stop_command: void;
	wall_selection_command: {
		position: THREE.Vector3;
		normal: THREE.Vector3;
	};
	update_player_orientation_command: {
		quaternion: THREE.Quaternion;
	};
	player_orientation_adjust: {
		direction: "LEFT" | "RIGHT";
	};
	player_fell_off_world: {
		message: string;
		position: { x: number; y: number; z: number };
	};
	player_reset_world_command: void;
	physics_initialization_error: {
		entityId: EntityId;
		entityType: string;
		error: Error;
		errorMessage: string;
	};
	start_game_command: void;
	game_win_event: void;
	scan_orb_collision: void;
	scan_orb_position_changed: void;
	recreate_scan_orb_command: void;
	
	// --- INTERNAL EVENT REQUESTS ---
	// convention: <requester>_request_<description>_<target>
	entity_dispose_physics_request: { entityId: EntityId };
	entity_dispose_rendering_request: { entityId: EntityId };

	// --- INTERNAL STATUS EVENTS ---
	entity_model_load_error: { entityId: EntityId; error: Error };
	entity_model_load_success: {
		entityId: EntityId;
		model: THREE.Group;
		animations: THREE.AnimationClip[];
	};
	entity_disposed: { entityId: EntityId };
	physics_engine_initialized: void;
	entity_added_to_manager: { entity: Entity };

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
