// import * as THREE from "three";
import { EventBus } from "../core/events/EventBus";
import type { GameMode } from "../GameManager";

type UI_ELEMENT =
	| "loading"
	| "keyboard_helper_question_mark"
	| "keyboard_helper_expanded_content"
	| "orientation_helper"
	| "forward_controls";

export class UIManager {
	// meta members
	private readonly events: EventBus;
	private readonly container: HTMLElement;
	// local members
	private readonly elements: Map<UI_ELEMENT, HTMLElement>;

	constructor(events: EventBus, container: HTMLElement) {
		this.container = container;
		this.elements = new Map();
		this.events = events;
		this.init();
		this.initEventListeners();
	}

	public dispose(): void {
		for (const element of this.elements.values()) {
			this.container.removeChild(element);
		}
		this.elements.clear(); // todo - is this needed?
	}

	// --- core init ---

	private init(): void {
		// this.addUiElement(UI_ELEMENTS.LOADING, this.initLoadingUI());
		const [questionMark, expandedContent] = this.initKeyboardHelper();
		this.addUiElement("keyboard_helper_question_mark", questionMark);
		this.addUiElement("keyboard_helper_expanded_content", expandedContent);
		this.addUiElement("orientation_helper", this.initOrientationHelper());
		this.addUiElement(
			"forward_controls",
			this.initForwardControls(this.events)
		);
	}

	private initEventListeners(): void {
		this.events.on("game_mode_updated", this.handleGameModeUpdated.bind(this));
	}

	// --- event handlers ---
	private handleGameModeUpdated(args: {
		prev: GameMode;
		curr: GameMode;
	}): void {
		// hide elements when switching away from a mode
		switch (args.prev) {
			case "loading":
				break;
			case "waiting":
				break;
			case "normal":
				break;
			case "gecko":
				this.hideElement("orientation_helper");
				break;
		}

		// show elements when switching to a mode
		switch (args.curr) {
			case "loading":
				break;
			case "waiting":
				break;
			case "normal":
				break;
			case "gecko":
				this.showElement("orientation_helper");
				break;
		}
	}

	// --- class interactions ---
	public addUiElement(name: UI_ELEMENT, element: HTMLElement): void {
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

	// --- keyboard helper
	private initKeyboardHelper(): [HTMLElement, HTMLElement] {
		// Question mark element
		const questionMark = document.createElement("div");
		questionMark.style.position = "absolute";
		questionMark.style.zIndex = "1000";
		questionMark.style.bottom = "12px";
		questionMark.style.left = "12px";
		questionMark.style.color = "white";
		questionMark.style.background = "oklch(0.3 0.007 0)";
		questionMark.style.padding = "12px";
		questionMark.style.borderRadius = "6px";
		questionMark.style.fontSize = "18px";
		questionMark.style.fontWeight = "bold";
		questionMark.style.textAlign = "center";
		questionMark.style.transition = "opacity 0.3s ease";
		questionMark.style.opacity = "1";
		questionMark.style.cursor = "pointer";
		questionMark.textContent = "?";

		// --- Expanded content elements ---
		const expandedContent = document.createElement("div");
		expandedContent.style.position = "absolute";
		expandedContent.style.zIndex = "1000";
		expandedContent.style.bottom = "12px";
		expandedContent.style.left = "12px";
		expandedContent.style.color = "white";
		expandedContent.style.background = "oklch(0.3 0.007 0)";
		expandedContent.style.padding = "12px";
		expandedContent.style.borderRadius = "6px";
		expandedContent.style.fontSize = "14px";
		expandedContent.style.fontWeight = "normal";
		expandedContent.style.textAlign = "left";
		expandedContent.style.transition = "opacity 0.3s ease";
		expandedContent.style.opacity = "0";
		expandedContent.style.pointerEvents = "none";
		expandedContent.style.marginRight = "12px";

		// --- Group 1 ---
		const moveText = document.createTextNode("Move: ");

		const wasdKbd = document.createElement("kbd");
		wasdKbd.textContent = "WASD";
		wasdKbd.style.backgroundColor = "oklch(0.2 0.007 0)";
		wasdKbd.style.borderRadius = "12px";
		wasdKbd.style.padding = "8px";
		wasdKbd.style.border = "1px solid black";

		const orText = document.createTextNode(" or ");

		const arrowsKbd = document.createElement("kbd");
		arrowsKbd.textContent = "Arrows";
		arrowsKbd.style.backgroundColor = "oklch(0.2 0.007 0)";
		arrowsKbd.style.borderRadius = "12px";
		arrowsKbd.style.padding = "8px";
		arrowsKbd.style.border = "1px solid black";

		const kbds = document.createElement("div");
		kbds.style.display = "flex";
		kbds.style.alignItems = "center";
		kbds.style.gap = "2px";
		kbds.appendChild(wasdKbd);
		kbds.appendChild(orText);
		kbds.appendChild(arrowsKbd);

		const group1 = document.createElement("div");
		group1.style.display = "flex";
		group1.style.justifyContent = "space-between";
		group1.style.alignItems = "center";
		group1.style.gap = "4px";
		group1.appendChild(moveText);
		group1.appendChild(kbds);

		// --- Group 2 ---
		const upDownText = document.createTextNode("Move Up / Down: ");

		const spaceKbd = document.createElement("kbd");
		spaceKbd.textContent = "Space (+ Shift)";
		spaceKbd.style.backgroundColor = "oklch(0.2 0.007 0)";
		spaceKbd.style.borderRadius = "12px";
		spaceKbd.style.padding = "8px";
		spaceKbd.style.border = "1px solid black";

		const group2 = document.createElement("div");
		group2.style.display = "flex";
		group2.style.justifyContent = "space-between";
		group2.style.alignItems = "center";
		group2.style.gap = "4px";
		group2.appendChild(upDownText);
		group2.appendChild(spaceKbd);

		// --- Group 3 ---
		const geckoText = document.createTextNode(
			"Enter Gecko mode (climb walls): "
		);

		const gKbd = document.createElement("kbd");
		gKbd.textContent = "G";
		gKbd.style.backgroundColor = "oklch(0.2 0.007 0)";
		gKbd.style.borderRadius = "12px";
		gKbd.style.padding = "8px";
		gKbd.style.border = "1px solid black";

		const group3 = document.createElement("div");
		group3.style.display = "flex";
		group3.style.justifyContent = "space-between";
		group3.style.alignItems = "center";
		group3.style.gap = "4px";
		group3.appendChild(geckoText);
		group3.appendChild(gKbd);

		// ---

		const verticalGroups = document.createElement("div");
		verticalGroups.style.display = "flex";
		verticalGroups.style.flexDirection = "column";
		verticalGroups.style.gap = "4px";

		verticalGroups.appendChild(group1);
		verticalGroups.appendChild(group2);
		verticalGroups.appendChild(group3);

		expandedContent.appendChild(verticalGroups);

		// Hover event handlers
		questionMark.onmouseenter = () => {
			questionMark.style.opacity = "0";
			expandedContent.style.opacity = "1";
		};

		questionMark.onmouseleave = () => {
			questionMark.style.opacity = "1";
			expandedContent.style.opacity = "0";
		};

		return [questionMark, expandedContent];
	}

	// --- forward controls
	// @todo - for curiosity - make these react components instead of defining with pure js
	private initForwardControls(events: EventBus): HTMLElement {
		const forwardControls = document.createElement("div");
		forwardControls.style.position = "absolute";
		forwardControls.style.bottom = "12px";
		forwardControls.style.right = "12px";
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
			// events.emit("update_player_orientation_command", {
			// 	quaternion: new THREE.Quaternion().setFromAxisAngle(
			// 		// yes, the vector is already normalized with the provided values.
			// 		// HOWEVER, setFromAxisAngle method expects a normalized vector,
			// 		// so the normalize method is added for clarity, to future proof changes, and allow others to quickly copy and paste.
			// 		new THREE.Vector3(0, 1, 0).normalize(),
			// 		Math.PI / 12 // 15 degrees in radians
			// 	),
			// });
			events.emit("player_orientation_adjust", {
				direction: "LEFT",
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
			console.log("UI Manager: Change forward direction right 15 degrees");
			// events.emit("update_player_orientation_command", {
			// 	quaternion: new THREE.Quaternion().setFromAxisAngle(
			// 		// redundant normalization for certainty and expressiveness
			// 		new THREE.Vector3(0, 1, 0).normalize(),
			// 		-Math.PI / 12 // -15 degrees in radians
			// 	),
			// });
			events.emit("player_orientation_adjust", {
				direction: "RIGHT",
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
	private initOrientationHelper(): HTMLDivElement {
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

	private showElement(el: UI_ELEMENT): void {
		const element = this.elements.get(el);
		if (element) {
			element.style.display = "block";
			element.style.opacity = "1";
		} else {
			console.warn("Element not found: ", el);
		}
	}

	private hideElement(el: UI_ELEMENT): void {
		const element = this.elements.get(el);
		if (element) {
			element.style.display = "none";
			element.style.opacity = "0";
		}
	}
}
