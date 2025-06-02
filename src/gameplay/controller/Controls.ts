import type { EventBus } from "../core/events/EventBus";
import type { GameMode } from "../GameManager";

// --- KEYBOARD CONTROLS ---

// Type for defining actions based on game mode for a specific key
export type KeyControlsByMode = Partial<
	Record<GameMode, { keyDown?: () => void; keyUp?: () => void }>
>;

export function getKeyControls(events: EventBus) {
	const keyControls = new Map<KeyboardEvent["type"], KeyControlsByMode>([
		// --- G, escape ---
		[
			"g",
			{
				normal: {
					keyDown: () => {
						events.emit("change_game_mode_command", {
							gameMode: "gecko",
						});
					},
				},
				gecko: {
					keyDown: () => {
						events.emit("change_game_mode_command", {
							gameMode: "normal",
						});
					},
				},
			},
		],
		[
			"escape",
			{
				gecko: {
					keyDown: () => {
						events.emit("change_game_mode_command", {
							gameMode: "normal",
						});
					},
				},
			},
		],
		// ---  [space], shift---
		[
			" ", // Space bar
			{
				normal: {
					keyDown: () =>
						events.emit("player_move_command", {
							command: "MOVE_START",
							direction: "UP",
						}),
					keyUp: () =>
						events.emit("player_move_command", {
							command: "MOVE_END",
							direction: "UP",
						}),
				},
			},
		],
		[
			"shift",
			{
				normal: {
					keyDown: () =>
						events.emit("player_move_command", {
							command: "START_MODIFY_UP",
							direction: "UP",
						}),
					keyUp: () =>
						events.emit("player_move_command", {
							command: "STOP_MODIFY_UP",
							direction: "UP",
						}),
				},
			},
		],
		// --- WASD & Arrows ---
		[
			"w",
			{
				normal: {
					keyDown: () =>
						events.emit("player_move_command", {
							command: "MOVE_START",
							direction: "FORWARD",
						}),
					keyUp: () =>
						events.emit("player_move_command", {
							command: "MOVE_END",
							direction: "FORWARD",
						}),
				},
			},
		],
		[
			"arrowup",
			{
				normal: {
					keyDown: () =>
						events.emit("player_move_command", {
							command: "MOVE_START",
							direction: "FORWARD",
						}),
					keyUp: () =>
						events.emit("player_move_command", {
							command: "MOVE_END",
							direction: "FORWARD",
						}),
				},
			},
		],
		[
			"a",
			{
				normal: {
					keyDown: () =>
						events.emit("player_move_command", {
							command: "MOVE_START",
							direction: "LEFT",
						}),
					keyUp: () =>
						events.emit("player_move_command", {
							command: "MOVE_END",
							direction: "LEFT",
						}),
				},
			},
		],
		[
			"arrowleft",
			{
				normal: {
					keyDown: () =>
						events.emit("player_move_command", {
							command: "MOVE_START",
							direction: "LEFT",
						}),
					keyUp: () =>
						events.emit("player_move_command", {
							command: "MOVE_END",
							direction: "LEFT",
						}),
				},
			},
		],
		[
			"s",
			{
				normal: {
					keyDown: () =>
						events.emit("player_move_command", {
							command: "MOVE_START",
							direction: "BACKWARD",
						}),
					keyUp: () =>
						events.emit("player_move_command", {
							command: "MOVE_END",
							direction: "BACKWARD",
						}),
				},
			},
		],
		[
			"arrowdown",
			{
				normal: {
					keyDown: () =>
						events.emit("player_move_command", {
							command: "MOVE_START",
							direction: "BACKWARD",
						}),
					keyUp: () =>
						events.emit("player_move_command", {
							command: "MOVE_END",
							direction: "BACKWARD",
						}),
				},
			},
		],
		[
			"d",
			{
				normal: {
					keyDown: () =>
						events.emit("player_move_command", {
							command: "MOVE_START",
							direction: "RIGHT",
						}),
					keyUp: () =>
						events.emit("player_move_command", {
							command: "MOVE_END",
							direction: "RIGHT",
						}),
				},
			},
		],
		[
			"arrowright",
			{
				normal: {
					keyDown: () =>
						events.emit("player_move_command", {
							command: "MOVE_START",
							direction: "RIGHT",
						}),
					keyUp: () =>
						events.emit("player_move_command", {
							command: "MOVE_END",
							direction: "RIGHT",
						}),
				},
			},
		],
	]);
	return keyControls;
}

// --- MOUSE CONTROLS ---

export type MouseControlsByMode = Partial<
	Record<GameMode, { action?: (e: MouseEvent) => void }>
>;

// !!! reconcile clicking UI elements with mouse controls !!!
// @todo - handle clicks within gameplay and not all over window
export const getMouseControls = (events: EventBus) => {
	const mouseControls = new Map<MouseEvent["type"], MouseControlsByMode>([
		[
			"mousedown",
			{
				normal: {
					action: (e: MouseEvent) => {
						events.emit("dummy_mouse_event", {
							message: "Mouse down",
							data: e,
						});
					},
				},
			},
		],
		[
			"mouseup",
			{
				normal: {
					action: (e: MouseEvent) => {
						events.emit("dummy_mouse_event", {
							message: "Mouse up",
							data: e,
						});
					},
				},
			},
		],
	]);

	return mouseControls;
};
