import { EventBus } from "../core/events/EventBus";
import type { GameManager } from "../GameManager";
import {
	getKeyControls,
	getMouseControls,
	type KeyControlsByMode,
	type MouseControlsByMode,
} from "./Controls";

export class Controller {
	private readonly events: EventBus;
	private readonly gameManager: GameManager;
	private readonly keysPressed: Set<string>;
	private readonly keyControls: Map<string, KeyControlsByMode>;
	private readonly mouseControls: Map<string, MouseControlsByMode>;

	constructor(events: EventBus, gameManager: GameManager) {
		this.events = events;
		this.gameManager = gameManager;
		this.keysPressed = new Set();
		this.keyControls = getKeyControls(events);
		this.mouseControls = getMouseControls(events);

		this.initInputListeners();
	}

	public dispose(): void {
		window.removeEventListener("keydown", this.handleKeyDown);
		window.removeEventListener("keyup", this.handleKeyUp);
		window.removeEventListener("mousedown", this.handleMouseEvent);
		window.removeEventListener("mouseup", this.handleMouseEvent);
	}

	private initInputListeners(): void {
		window.addEventListener("keydown", this.handleKeyDown);
		window.addEventListener("keyup", this.handleKeyUp);
		window.addEventListener("mousedown", this.handleMouseEvent);
		window.addEventListener("mouseup", this.handleMouseEvent);
	}

	// --- handle input events ---

	// make a function to handle key down and key up and then you could cache the pressed key actions

	private handleKeyDown = (event: KeyboardEvent): void => {
		const key = event.key.toLowerCase();
		if (this.keysPressed.has(key)) return; // Ignore if already pressed
		if (event.repeat) return; // Prevent spamming for actions that shouldn't repeat on hold

		this.keysPressed.add(key);

		const controls = this.keyControls.get(key);
		if (controls) {
			const modeControls = controls[this.gameManager.gameMode];
			if (modeControls && modeControls.keyDown) {
				modeControls.keyDown();
			}
		}
	};

	private handleKeyUp = (event: KeyboardEvent): void => {
		const key = event.key.toLowerCase();
		this.keysPressed.delete(key);

		const controls = this.keyControls.get(key);
		if (controls) {
			const modeControls = controls[this.gameManager.gameMode];
			if (modeControls && modeControls.keyUp) {
				modeControls.keyUp();
			}
		}
	};

	private handleMouseEvent = (event: MouseEvent): void => {
		const controls = this.mouseControls.get(event.type);
		if (controls) {
			const modeControls = controls[this.gameManager.gameMode];
			if (modeControls && modeControls.action) {
				modeControls.action(event);
			}
		}
	};
}
