// import * as THREE from "three";
import { EventBus } from "../core/events/EventBus";
import type { GameMode } from "../GameManager";

type UI_ELEMENT =
	| "loading"
	| "keyboard_helper_question_mark"
	| "keyboard_helper_expanded_content"
	| "orientation_helper"
	| "forward_controls"
	| "fall_notification"
	| "physics_errors"
	| "scan_orb_celebration"
	| "game_win";

export class UIManager {
	// meta members
	private readonly events: EventBus;
	private readonly container: HTMLElement;
	// local members
	private readonly elements: Map<UI_ELEMENT, HTMLElement>;
	private physicsErrors: Array<{
		entityId: string;
		entityType: string;
		error: Error;
		errorMessage: string;
	}> = [];
	private hasShownFirstScanOrbCelebration: boolean = false;

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

	// Public getter for physics errors count
	public getPhysicsErrorsCount(): number {
		return this.physicsErrors.length;
	}

	// Public method to reset scan orb celebration state
	public resetScanOrbCelebration(): void {
		console.log("UIManager: Resetting scan orb celebration state");
		this.hasShownFirstScanOrbCelebration = false;
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
		this.addUiElement("fall_notification", this.initFallNotification());
		this.addUiElement("physics_errors", this.initPhysicsErrorsNotification());
		this.addUiElement("scan_orb_celebration", this.initScanOrbCelebration());
		this.addUiElement("game_win", this.initGameWinNotification());
	}

	private initEventListeners(): void {
		this.events.on("game_mode_updated", this.handleGameModeUpdated.bind(this));
		this.events.on(
			"player_fell_off_world",
			this.handlePlayerFellOffWorld.bind(this)
		);
		this.events.on(
			"physics_initialization_error",
			this.handlePhysicsInitializationError.bind(this)
		);
		this.events.on(
			"scan_orb_collision",
			this.handleScanOrbCollision.bind(this)
		);
		this.events.on("game_win_event", this.handleGameWinEvent.bind(this));
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
		// START IN EXPANDED STATE

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
		questionMark.style.opacity = "0";
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
		expandedContent.style.opacity = "1";
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
		const upDownText = document.createTextNode("Jump: ");

		const spaceKbd = document.createElement("kbd");
		spaceKbd.textContent = "Space";
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

		// note: the content starts out in expanded state. will be hidden after mouse enter and exit.
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

	// --- fall notification
	private initFallNotification(): HTMLDivElement {
		const fallNotification = document.createElement("div");
		fallNotification.style.display = "none"; // initially hidden
		fallNotification.style.position = "absolute";
		fallNotification.style.top = "50%";
		fallNotification.style.left = "50%";
		fallNotification.style.transform = "translate(-50%, -50%)";
		fallNotification.style.padding = "30px";
		fallNotification.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
		fallNotification.style.color = "white";
		fallNotification.style.borderRadius = "10px";
		fallNotification.style.fontFamily = "Arial, sans-serif";
		fallNotification.style.fontSize = "18px";
		fallNotification.style.textAlign = "center";
		fallNotification.style.zIndex = "2000";
		fallNotification.style.border = "2px solid #ff4444";
		fallNotification.style.maxWidth = "400px";

		// Create message text
		const messageText = document.createElement("div");
		messageText.style.marginBottom = "20px";
		messageText.style.lineHeight = "1.4";
		messageText.textContent = "You've fallen off the world!";

		// Create reset button
		const resetButton = document.createElement("button");
		resetButton.textContent = "Return to Platform";
		resetButton.style.padding = "12px 24px";
		resetButton.style.fontSize = "16px";
		resetButton.style.backgroundColor = "#4CAF50";
		resetButton.style.color = "white";
		resetButton.style.border = "none";
		resetButton.style.borderRadius = "5px";
		resetButton.style.cursor = "pointer";
		resetButton.style.fontWeight = "bold";
		resetButton.style.transition = "background-color 0.3s ease";

		// Button hover effect
		resetButton.onmouseenter = () => {
			resetButton.style.backgroundColor = "#45a049";
		};
		resetButton.onmouseleave = () => {
			resetButton.style.backgroundColor = "#4CAF50";
		};

		// Button click handler - emit event to reset player
		resetButton.onclick = () => {
			console.log(
				"UIManager: Player requested reset via fall notification button"
			);
			this.events.emit("player_reset_world_command", undefined);
			this.hideElement("fall_notification");
		};

		// Assemble notification
		fallNotification.appendChild(messageText);
		fallNotification.appendChild(resetButton);

		return fallNotification;
	}

	private handlePlayerFellOffWorld(payload: {
		message: string;
		position: { x: number; y: number; z: number };
	}): void {
		console.log("UIManager: Player fell off world, showing notification");

		// Update the message text
		const notification = this.elements.get("fall_notification");
		if (notification) {
			const messageText = notification.querySelector("div");
			if (messageText) {
				messageText.textContent = payload.message;
			}
		}

		// Show the notification
		this.showElement("fall_notification");
	}

	// --- physics errors notification
	private initPhysicsErrorsNotification(): HTMLDivElement {
		const physicsErrorsNotification = document.createElement("div");
		physicsErrorsNotification.style.display = "none"; // initially hidden
		physicsErrorsNotification.style.position = "absolute";
		physicsErrorsNotification.style.top = "50%";
		physicsErrorsNotification.style.left = "50%";
		physicsErrorsNotification.style.transform = "translate(-50%, -50%)";
		physicsErrorsNotification.style.padding = "30px";
		physicsErrorsNotification.style.backgroundColor = "rgba(0, 0, 0, 0.95)";
		physicsErrorsNotification.style.color = "white";
		physicsErrorsNotification.style.borderRadius = "10px";
		physicsErrorsNotification.style.fontFamily = "Arial, sans-serif";
		physicsErrorsNotification.style.fontSize = "16px";
		physicsErrorsNotification.style.textAlign = "left";
		physicsErrorsNotification.style.zIndex = "2000";
		physicsErrorsNotification.style.border = "2px solid #ff6b6b";
		physicsErrorsNotification.style.maxWidth = "600px";
		physicsErrorsNotification.style.maxHeight = "70vh";
		physicsErrorsNotification.style.overflowY = "auto";

		// Create title
		const title = document.createElement("h2");
		title.textContent = "Physics Initialization Errors";
		title.style.margin = "0 0 20px 0";
		title.style.color = "#ff6b6b";
		title.style.fontSize = "24px";
		title.style.textAlign = "center";

		// Create error list container
		const errorList = document.createElement("div");
		errorList.className = "error-list";
		errorList.style.marginBottom = "20px";

		// Create reload instructions
		const instructions = document.createElement("div");
		instructions.textContent =
			"These errors may prevent the game from working correctly. Please reload the page and try again.";
		instructions.style.marginBottom = "20px";
		instructions.style.padding = "15px";
		instructions.style.backgroundColor = "rgba(255, 107, 107, 0.1)";
		instructions.style.borderRadius = "5px";
		instructions.style.border = "1px solid #ff6b6b";

		// Create reload button
		const reloadButton = document.createElement("button");
		reloadButton.textContent = "Reload Page";
		reloadButton.style.padding = "12px 24px";
		reloadButton.style.fontSize = "16px";
		reloadButton.style.backgroundColor = "#ff6b6b";
		reloadButton.style.color = "white";
		reloadButton.style.border = "none";
		reloadButton.style.borderRadius = "5px";
		reloadButton.style.cursor = "pointer";
		reloadButton.style.fontWeight = "bold";
		reloadButton.style.transition = "background-color 0.3s ease";
		reloadButton.style.display = "block";
		reloadButton.style.margin = "0 auto";

		// Button hover effect
		reloadButton.onmouseenter = () => {
			reloadButton.style.backgroundColor = "#ff5252";
		};
		reloadButton.onmouseleave = () => {
			reloadButton.style.backgroundColor = "#ff6b6b";
		};

		// Button click handler - reload the page
		reloadButton.onclick = () => {
			window.location.reload();
		};

		// Assemble notification
		physicsErrorsNotification.appendChild(title);
		physicsErrorsNotification.appendChild(instructions);
		physicsErrorsNotification.appendChild(errorList);
		physicsErrorsNotification.appendChild(reloadButton);

		return physicsErrorsNotification;
	}

	private handlePhysicsInitializationError(payload: {
		entityId: string;
		entityType: string;
		error: Error;
		errorMessage: string;
	}): void {
		console.log("UIManager: Physics initialization error received", payload);

		// Add error to the array
		this.physicsErrors.push(payload);

		// Update the error list display
		this.updatePhysicsErrorsDisplay();

		// Show the notification
		this.showElement("physics_errors");
	}

	private updatePhysicsErrorsDisplay(): void {
		const notification = this.elements.get("physics_errors");
		if (!notification) return;

		const errorList = notification.querySelector(".error-list");
		if (!errorList) return;

		// Clear existing errors
		errorList.innerHTML = "";

		// Add each error to the list
		this.physicsErrors.forEach((error, index) => {
			const errorItem = document.createElement("div");
			errorItem.style.marginBottom = "15px";
			errorItem.style.padding = "15px";
			errorItem.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
			errorItem.style.borderRadius = "5px";
			errorItem.style.border = "1px solid rgba(255, 107, 107, 0.3)";

			const errorTitle = document.createElement("h4");
			errorTitle.textContent = `Error ${index + 1}: ${error.entityType} (${
				error.entityId
			})`;
			errorTitle.style.margin = "0 0 10px 0";
			errorTitle.style.color = "#ff6b6b";
			errorTitle.style.fontSize = "18px";

			const errorMessage = document.createElement("p");
			errorMessage.textContent = error.errorMessage;
			errorMessage.style.margin = "0";
			errorMessage.style.fontSize = "14px";
			errorMessage.style.lineHeight = "1.4";

			errorItem.appendChild(errorTitle);
			errorItem.appendChild(errorMessage);
			errorList.appendChild(errorItem);
		});
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

	// --- scan orb celebration ---
	private initScanOrbCelebration(): HTMLDivElement {
		const celebration = document.createElement("div");
		celebration.style.display = "none"; // initially hidden
		celebration.style.position = "absolute";
		celebration.style.top = "50%";
		celebration.style.left = "50%";
		celebration.style.transform = "translate(-50%, -50%)";
		celebration.style.padding = "40px";
		celebration.style.backgroundColor = "rgba(0, 255, 170, 0.95)";
		celebration.style.color = "white";
		celebration.style.borderRadius = "20px";
		celebration.style.fontFamily = "Arial, sans-serif";
		celebration.style.fontSize = "24px";
		celebration.style.textAlign = "center";
		celebration.style.zIndex = "3000";
		celebration.style.border = "3px solid #00ffaa";
		celebration.style.boxShadow = "0 0 30px rgba(0, 255, 170, 0.6)";
		celebration.style.maxWidth = "500px";
		celebration.style.animation = "celebrationPulse 0.5s ease-in-out";
		celebration.style.transition = "opacity 0.3s ease";

		// Add CSS animation keyframes
		const style = document.createElement("style");
		style.textContent = `
			@keyframes celebrationPulse {
				0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
				50% { transform: translate(-50%, -50%) scale(1.1); }
				100% { transform: translate(-50%, -50%) scale(1.0); opacity: 1; }
			}
			@keyframes confetti {
				0% { transform: translateY(-100vh) rotate(0deg); }
				100% { transform: translateY(100vh) rotate(360deg); }
			}
		`;
		document.head.appendChild(style);

		const messageText = document.createElement("div");
		messageText.className = "celebration-message";
		messageText.style.fontSize = "28px";
		messageText.style.fontWeight = "bold";
		messageText.style.marginBottom = "20px";
		messageText.style.textShadow = "2px 2px 4px rgba(0,0,0,0.5)";

		celebration.appendChild(messageText);

		return celebration;
	}

	private handleScanOrbCollision(): void {
		const celebration = this.elements.get("scan_orb_celebration");
		if (!celebration) return;

		const messageElement = celebration.querySelector(".celebration-message");
		if (!messageElement) return;

		if (this.hasShownFirstScanOrbCelebration) {
			this.showConfetti();
		} else {
			// First collision - show encouraging message
			messageElement.textContent =
				"Great Job! You Scanned your first location! Find the rest of the locations to scan!";
			this.showCelebration();
			this.showConfetti();
			this.hasShownFirstScanOrbCelebration = true;
		}
	}

	private showCelebration(): void {
		const celebration = this.elements.get("scan_orb_celebration");
		if (celebration) {
			celebration.style.display = "block";
			celebration.style.opacity = "1";

			// Auto-hide after 3 seconds
			setTimeout(() => {
				this.hideElement("scan_orb_celebration");
			}, 3000);
		}
	}

	private async showConfetti(): Promise<void> {
		// Create multiple confetti pieces
		const colors = [
			"#ff6b6b",
			"#4ecdc4",
			"#45b7d1",
			"#96ceb4",
			"#feca57",
			"#ff9ff3",
		];
		const confettiCount = 500;

		for (let i = 0; i < confettiCount; i++) {
			if (i % 100 === 0) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
			const confetti = document.createElement("div");
			confetti.style.position = "absolute";
			confetti.style.width = "10px";
			confetti.style.height = "10px";
			confetti.style.backgroundColor =
				colors[Math.floor(Math.random() * colors.length)];
			confetti.style.left = Math.random() * 99 + "%";
			confetti.style.top = "-20px";
			confetti.style.borderRadius = "50%";
			confetti.style.zIndex = "4000";
			confetti.style.pointerEvents = "none";
			confetti.style.animation = `confetti ${Math.max(
				1,
				Math.random() * 2
			)}s linear forwards`;

			this.container.appendChild(confetti);

			// Remove confetti after animation
			setTimeout(() => {
				if (this.container.contains(confetti)) {
					this.container.removeChild(confetti);
				}
			}, 2000);
		}
	}

	private initGameWinNotification(): HTMLDivElement {
		const gameWinNotification = document.createElement("div");
		gameWinNotification.style.display = "none"; // initially hidden
		gameWinNotification.style.position = "absolute";
		gameWinNotification.style.top = "50%";
		gameWinNotification.style.left = "50%";
		gameWinNotification.style.transform = "translate(-50%, -50%)";
		gameWinNotification.style.padding = "40px";
		gameWinNotification.style.backgroundColor = "rgba(0, 255, 170, 0.95)";
		gameWinNotification.style.color = "white";
		gameWinNotification.style.borderRadius = "20px";
		gameWinNotification.style.fontFamily = "Arial, sans-serif";
		gameWinNotification.style.fontSize = "24px";
		gameWinNotification.style.textAlign = "center";
		gameWinNotification.style.zIndex = "3000";
		gameWinNotification.style.border = "3px solid #00ffaa";
		gameWinNotification.style.boxShadow = "0 0 30px rgba(0, 255, 170, 0.6)";
		gameWinNotification.style.maxWidth = "500px";
		gameWinNotification.style.animation = "gameWinNotificationPulse 0.5s ease-in-out";
		gameWinNotification.style.transition = "opacity 0.3s ease";

		// Add CSS animation keyframes
		const style = document.createElement("style");
		style.textContent = `
			@keyframes gameWinNotificationPulse {
				0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
				50% { transform: translate(-50%, -50%) scale(1.1); }
				100% { transform: translate(-50%, -50%) scale(1.0); opacity: 1; }
			}
			@keyframes confetti {
				0% { transform: translateY(-100vh) rotate(0deg); }
				100% { transform: translateY(100vh) rotate(360deg); }
			}
		`;
		document.head.appendChild(style);

		const messageText = document.createElement("div");
		messageText.className = "gameWinNotification-message";
		messageText.style.fontSize = "28px";
		messageText.style.fontWeight = "bold";
		messageText.style.marginBottom = "20px";
		messageText.style.textShadow = "2px 2px 4px rgba(0,0,0,0.5)";
		messageText.textContent = "Congratulations! You've won the game!";

		gameWinNotification.appendChild(messageText);

		// // Create reset button
		// const resetButton = document.createElement("button");
		// resetButton.textContent = "Restart Game";
		// resetButton.style.padding = "12px 24px";
		// resetButton.style.fontSize = "16px";
		// resetButton.style.backgroundColor = "#4CAF50";
		// resetButton.style.color = "white";
		// resetButton.style.border = "none";
		// resetButton.style.borderRadius = "5px";
		// resetButton.style.cursor = "pointer";
		// resetButton.style.fontWeight = "bold";
		// resetButton.style.transition = "background-color 0.3s ease";

		// // Button hover effect
		// resetButton.onmouseenter = () => {
		// 	resetButton.style.backgroundColor = "#45a046";
		// };
		// resetButton.onmouseleave = () => {
		// 	resetButton.style.backgroundColor = "#4CAF50";
		// };

		// // Button click handler - emit event to reset player and recreate scan orb
		// resetButton.onclick = () => {
		// 	console.log(
		// 		"UIManager: Player requested reset via game win notification button"
		// 	);
		// 	console.log("UIManager: Emitting player_reset_world_command");
		// 	this.events.emit("player_reset_world_command", undefined);
		// 	console.log("UIManager: Emitting recreate_scan_orb_command");
		// 	this.events.emit("recreate_scan_orb_command", undefined);
		// 	console.log("UIManager: Both reset commands emitted, hiding game win modal");
		// 	this.hideElement("game_win");
		// };

		// Assemble notification
		gameWinNotification.appendChild(messageText);
		// gameWinNotification.appendChild(resetButton);

		return gameWinNotification;
	}

	private handleGameWinEvent(): void {
		console.log("UIManager: Game win event received");
		this.showElement("game_win");
	}
}
