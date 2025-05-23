import { EventSystem, EVENT } from "../core/events/EventSystem";
import type { GameMode } from "../GameManager";

const UI_ELEMENTS = {
	LOADING: "loading",
	KEYBOARD: "keyboard",
	ORIENTATION_HELP_TEXT: "orientation-help-text",
	FORWARD_CONTROLS: "forward-controls",
} as const;

export class UIManager {
	// meta members
	private events: EventSystem;
	private container: HTMLElement;
	// local members
	private elements: Map<
		(typeof UI_ELEMENTS)[keyof typeof UI_ELEMENTS],
		HTMLElement
	>;

	constructor(events: EventSystem, container: HTMLElement) {
		this.container = container;
		this.elements = new Map();
		this.events = events;
		this.init();
		this.initEventListeners();
	}

	public cleanup(): void {
		for (const element of this.elements.values()) {
			this.container.removeChild(element);
		}
		this.elements.clear(); // todo - is this needed?
	}

	// --- core init ---

	private init(): void {
		// this.addUiElement(UI_ELEMENTS.LOADING, this.initLoadingUI());
		this.addUiElement(UI_ELEMENTS.KEYBOARD, this.initKeyboardHelper());
		this.addUiElement(
			UI_ELEMENTS.ORIENTATION_HELP_TEXT,
			this.initOrientationHelpText()
		);
		this.addUiElement(
			UI_ELEMENTS.FORWARD_CONTROLS,
			this.initForwardControls(this.events)
		);
	}

	private initEventListeners(): void {
		this.events.on(
			EVENT.GAME_MODE_UPDATED,
			this.handleGameModeUpdated.bind(this)
		);
	}

	// --- event handlers ---
	private handleGameModeUpdated(args: {
		prev: GameMode;
		curr: GameMode;
	}): void {
		if (args.curr === "gecko") {
			this.showOrientationHelpText();
		} else {
			this.hideOrientationHelpText();
		}
	}

	// --- class interactions ---
	public addUiElement(
		name: (typeof UI_ELEMENTS)[keyof typeof UI_ELEMENTS],
		element: HTMLElement
	): void {
		this.elements.set(name, element);
		this.container.appendChild(element);
	}

	// --- update loading progress
	public updateLoadingProgress(progress: number): void {
		if (!this.elements) return;

		const loadingElement = this.elements.get("loading");
		if (!loadingElement) return;
		const percent = Math.round(progress * 100);
		const loadingBar = loadingElement.querySelector(".loading-bar");
		if (loadingBar && loadingBar instanceof HTMLElement) {
			loadingBar.style.width = `${percent}%`;
		}
		const loadingText = loadingElement.querySelector(".loading-text");
		if (loadingText && loadingText instanceof HTMLElement) {
			loadingText.textContent = `Loading Starship: ${percent}%`;
		}
		if (progress >= 1.0) {
			setTimeout(() => {
				if (loadingElement) {
					loadingElement.style.display = "none";
				}
			}, 500);
		}
	}

	// --- utility initializers ---

	// --- loading
	private initLoadingUI(): HTMLDivElement {
		const loadingContainer = document.createElement("div");
		loadingContainer.style.position = "absolute";
		loadingContainer.style.top = "20px";
		loadingContainer.style.left = "50%";
		loadingContainer.style.transform = "translateX(-50%)";
		loadingContainer.style.width = "300px";
		loadingContainer.style.padding = "10px";
		loadingContainer.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
		loadingContainer.style.borderRadius = "5px";
		loadingContainer.style.color = "white";
		loadingContainer.style.fontFamily = "Arial, sans-serif";
		loadingContainer.style.zIndex = "1000";
		loadingContainer.style.display = "flex";
		loadingContainer.style.flexDirection = "column";
		loadingContainer.style.alignItems = "center";

		const loadingText = document.createElement("div");
		loadingText.classList.add("loading-text");
		loadingText.textContent = "Loading Scene: 0%";
		loadingText.style.marginBottom = "5px";

		const loadingBarContainer = document.createElement("div");
		loadingBarContainer.style.width = "100%";
		loadingBarContainer.style.height = "20px";
		loadingBarContainer.style.backgroundColor = "#333";
		loadingBarContainer.style.borderRadius = "3px";
		loadingBarContainer.style.overflow = "hidden";

		const loadingBar = document.createElement("div");
		loadingBar.classList.add("loading-bar");
		loadingBar.style.width = "0%";
		loadingBar.style.height = "100%";
		loadingBar.style.backgroundColor = "#4CAF50";
		loadingBar.style.transition = "width 0.3s ease";

		loadingBarContainer.appendChild(loadingBar);

		loadingContainer.appendChild(loadingText);
		loadingContainer.appendChild(loadingBarContainer);
		return loadingContainer;
	}

	// --- keyboard helper
	private initKeyboardHelper(): HTMLElement {
		const keyboardHelper = document.createElement("div");
		keyboardHelper.style.position = "absolute";
		keyboardHelper.style.zIndex = "1000";
		keyboardHelper.style.bottom = "10px";
		keyboardHelper.style.left = "10px";
		keyboardHelper.style.color = "white";
		keyboardHelper.style.background = "oklch(0.2 0.007 0)";
		keyboardHelper.style.padding = "12px";
		keyboardHelper.style.borderRadius = "6px";

		const moveText = document.createTextNode("Move: ");
		keyboardHelper.appendChild(moveText);

		const wasdKbd = document.createElement("kbd");
		wasdKbd.textContent = "WASD";
		wasdKbd.style.backgroundColor = "var(--accent-foreground)";
		wasdKbd.style.borderRadius = "0.375rem";
		wasdKbd.style.padding = "0.5rem";
		wasdKbd.style.border = "1px solid black";
		keyboardHelper.appendChild(wasdKbd);

		const orText = document.createTextNode(" or ");
		keyboardHelper.appendChild(orText);

		const arrowsKbd = document.createElement("kbd");
		arrowsKbd.textContent = "Arrows";
		arrowsKbd.style.backgroundColor = "var(--accent-foreground)";
		arrowsKbd.style.borderRadius = "0.375rem";
		arrowsKbd.style.padding = "0.5rem";
		arrowsKbd.style.border = "1px solid black";
		keyboardHelper.appendChild(arrowsKbd);

		const separator1 = document.createTextNode(" | ");
		keyboardHelper.appendChild(separator1);

		const spaceKbd = document.createElement("kbd");
		spaceKbd.textContent = "Space";
		spaceKbd.style.backgroundColor = "var(--accent-foreground)";
		spaceKbd.style.borderRadius = "0.375rem";
		spaceKbd.style.padding = "0.5rem";
		spaceKbd.style.border = "1px solid black";
		keyboardHelper.appendChild(spaceKbd);

		const jumpText = document.createTextNode(" to jump ");
		keyboardHelper.appendChild(jumpText);

		const separator2 = document.createTextNode("| ");
		keyboardHelper.appendChild(separator2);

		const gKbd = document.createElement("kbd");
		gKbd.textContent = "G";
		gKbd.style.backgroundColor = "var(--accent-foreground)";
		gKbd.style.borderRadius = "0.375rem";
		gKbd.style.padding = "0.5rem";
		gKbd.style.border = "1px solid black";
		keyboardHelper.appendChild(gKbd);

		const geckoText = document.createTextNode(
			" to enter Gecko mode (climb walls)"
		);
		keyboardHelper.appendChild(geckoText);

		return keyboardHelper;
	}

	// --- forward controls
	// @todo - for curiosity - make these react components instead of defining with pure js
	private initForwardControls(events: EventSystem): HTMLElement {
		const forwardControls = document.createElement("div");
		forwardControls.style.position = "absolute";
		forwardControls.style.bottom = "10px";
		forwardControls.style.right = "10px";
		forwardControls.style.color = "white";
		forwardControls.style.zIndex = "1000";

		// Create circular container
		const circle = document.createElement("div");
		circle.style.position = "relative";
		circle.style.width = "120px";
		circle.style.height = "120px";
		circle.style.borderRadius = "50%";
		circle.style.border = "2px solid rgba(255, 255, 255, 0.5)";
		circle.style.display = "flex";
		circle.style.backgroundColor = "rgba(0, 0, 0, 0.3)";

		// Left arrow half
		const leftHalf = document.createElement("div");
		leftHalf.style.width = "50%";
		leftHalf.style.height = "100%";
		leftHalf.style.display = "flex";
		leftHalf.style.alignItems = "center";
		leftHalf.style.justifyContent = "center";
		leftHalf.style.cursor = "pointer";
		leftHalf.innerHTML = "◀"; // Left arrow character
		leftHalf.style.fontSize = "24px";
		leftHalf.style.userSelect = "none";
		leftHalf.onclick = () => {
			console.log("forwardControls: move forward direction left 15 degrees");
			events.emit(EVENT.UPDATE_PHYSICS_ORIENTATION_COMMAND, {
				semanticCommand: "forwardLeft",
			});
		};

		// Right arrow half
		const rightHalf = document.createElement("div");
		rightHalf.style.width = "50%";
		rightHalf.style.height = "100%";
		rightHalf.style.display = "flex";
		rightHalf.style.alignItems = "center";
		rightHalf.style.justifyContent = "center";
		rightHalf.style.cursor = "pointer";
		rightHalf.innerHTML = "▶"; // Right arrow character
		rightHalf.style.fontSize = "24px";
		rightHalf.style.userSelect = "none";
		rightHalf.onclick = () => {
			console.log("forwardControls: move forward direction right 15 degrees");
			events.emit(EVENT.UPDATE_PHYSICS_ORIENTATION_COMMAND, {
				semanticCommand: "forwardRight",
			});
		};

		// Add divider line
		const divider = document.createElement("div");
		divider.style.position = "absolute";
		divider.style.left = "50%";
		divider.style.top = "10%";
		divider.style.bottom = "10%";
		divider.style.width = "1px";
		divider.style.backgroundColor = "rgba(255, 255, 255, 0.5)";

		// Assemble
		circle.appendChild(leftHalf);
		circle.appendChild(rightHalf);
		circle.appendChild(divider);
		forwardControls.appendChild(circle);
		return forwardControls;
	}

	// --- help text for gecko mode
	private initOrientationHelpText(): HTMLDivElement {
		const helpTextElement = document.createElement("div");
		helpTextElement.style.display = "none"; // initially hidden
		helpTextElement.style.position = "absolute";
		helpTextElement.style.top = "20px";
		helpTextElement.style.left = "50%";
		helpTextElement.style.transform = "translateX(-50%)";
		helpTextElement.style.padding = "10px";
		helpTextElement.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
		helpTextElement.style.color = "white";
		helpTextElement.style.borderRadius = "5px";
		helpTextElement.style.fontFamily = "Arial, sans-serif";
		helpTextElement.style.fontSize = "14px";
		helpTextElement.style.textAlign = "center";
		helpTextElement.style.zIndex = "1000";
		helpTextElement.style.pointerEvents = "none"; // Don't block mouse events
		helpTextElement.textContent =
			"Click on a wall to climb. Press ESC to cancel.";

		return helpTextElement;
	}

	private showOrientationHelpText(): void {
		const helpTextElement = this.elements.get("orientation-help-text");
		if (helpTextElement) {
			helpTextElement.style.display = "block";
		}
	}

	private hideOrientationHelpText(): void {
		const helpTextElement = this.elements.get("orientation-help-text");
		if (helpTextElement) {
			helpTextElement.style.display = "none";
		}
	}

	// --- ---
}
