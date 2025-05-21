import { EventSystem, EVENT } from "../EventSystem";
import type { GameMode } from "../GameManager";

// Type for defining actions based on game mode for a specific key
type KeyActionsByMode = Partial<
	Record<GameMode, { keyDown?: () => void; keyUp?: () => void }>
>;

type MouseActionsByMode = Partial<
	Record<GameMode, { mouseDown?: () => void; mouseUp?: () => void }>
>;

export class Controller {
	private events: EventSystem;
	private readonly gameMode: GameMode;

	private readonly keyActions: Map<string, KeyActionsByMode>;
	private readonly mouseActions: Map<string, MouseActionsByMode>;

	private keysPressed: Set<string>;

	constructor(events: EventSystem, gameMode: GameMode) {
		this.events = events;
		this.gameMode = gameMode;
		this.keysPressed = new Set();
		this.keyActions = new Map<string, KeyActionsByMode>([
			[
				" ", // Space bar
				{
					normal: {
						keyDown: () => {
							this.events.emit(EVENT.PLAYER_JUMP_COMMAND, null);
						},
					},
				},
			],
			[
				"g",
				{
					normal: {
						keyDown: () => {
							this.events.emit(EVENT.CHANGE_GAME_MODE_COMMAND, {
								gameMode: "gecko",
							});
						},
					},
					gecko: {
						keyDown: () => {
							this.events.emit(EVENT.CHANGE_GAME_MODE_COMMAND, {
								gameMode: "normal",
							});
						},
					},
				},
			],
			// Event-driven movement keys
			[
				"w",
				{
					normal: {
						keyDown: () =>
							this.events.emit(EVENT.PLAYER_MOVE_COMMAND, {
								command: "MOVE_START",
								direction: "FORWARD",
							}),
						keyUp: () =>
							this.events.emit(EVENT.PLAYER_MOVE_COMMAND, {
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
							this.events.emit(EVENT.PLAYER_MOVE_COMMAND, {
								command: "MOVE_START",
								direction: "FORWARD",
							}),
						keyUp: () =>
							this.events.emit(EVENT.PLAYER_MOVE_COMMAND, {
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
							this.events.emit(EVENT.PLAYER_MOVE_COMMAND, {
								command: "MOVE_START",
								direction: "LEFT",
							}),
						keyUp: () =>
							this.events.emit(EVENT.PLAYER_MOVE_COMMAND, {
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
							this.events.emit(EVENT.PLAYER_MOVE_COMMAND, {
								command: "MOVE_START",
								direction: "LEFT",
							}),
						keyUp: () =>
							this.events.emit(EVENT.PLAYER_MOVE_COMMAND, {
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
							this.events.emit(EVENT.PLAYER_MOVE_COMMAND, {
								command: "MOVE_START",
								direction: "BACKWARD",
							}),
						keyUp: () =>
							this.events.emit(EVENT.PLAYER_MOVE_COMMAND, {
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
							this.events.emit(EVENT.PLAYER_MOVE_COMMAND, {
								command: "MOVE_START",
								direction: "BACKWARD",
							}),
						keyUp: () =>
							this.events.emit(EVENT.PLAYER_MOVE_COMMAND, {
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
							this.events.emit(EVENT.PLAYER_MOVE_COMMAND, {
								command: "MOVE_START",
								direction: "RIGHT",
							}),
						keyUp: () =>
							this.events.emit(EVENT.PLAYER_MOVE_COMMAND, {
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
							this.events.emit(EVENT.PLAYER_MOVE_COMMAND, {
								command: "MOVE_START",
								direction: "RIGHT",
							}),
						keyUp: () =>
							this.events.emit(EVENT.PLAYER_MOVE_COMMAND, {
								command: "MOVE_END",
								direction: "RIGHT",
							}),
					},
				},
			],
		]);

		this.mouseActions = new Map<string, MouseActionsByMode>([
			[
				"click",
				{
					normal: {
						mouseDown: () => {},
					},
				},
			],
		]);

		this.initInputListeners();
	}

	public cleanup(): void {
		window.removeEventListener("keydown", this.handleKeyDown);
		window.removeEventListener("keyup", this.handleKeyUp);
		window.removeEventListener("mousedown", this.handleMouseDown);
		window.removeEventListener("mouseup", this.handleMouseUp);
	}

	private initInputListeners(): void {
		window.addEventListener("keydown", this.handleKeyDown);
		window.addEventListener("keyup", this.handleKeyUp);
		window.addEventListener("mousedown", this.handleMouseDown);
		window.addEventListener("mouseup", this.handleMouseUp);
	}

	// --- handle input events ---

	private handleKeyDown = (event: KeyboardEvent): void => {
		const key = event.key.toLowerCase();
		if (event.repeat) return; // Prevent spamming for actions that shouldn't repeat on hold
		this.keysPressed.add(key);
		const actions = this.keyActions.get(key);
		if (actions) {
			const modeActions = actions[this.gameMode];
			if (modeActions && modeActions.keyDown) {
				modeActions.keyDown();
			}
		}
	};

	private handleKeyUp = (event: KeyboardEvent): void => {
		const key = event.key.toLowerCase();
		this.keysPressed.delete(key);

		const actions = this.keyActions.get(key);
		if (actions) {
			const modeActions = actions[this.gameMode];
			if (modeActions && modeActions.keyUp) {
				modeActions.keyUp();
			}
		}
	};

	private handleMouseDown = (event: MouseEvent): void => {
		console.log("mouse down:", event);
	};

	private handleMouseUp = (event: MouseEvent): void => {
		console.log("mouse up:", event);
	};
}
