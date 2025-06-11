import * as THREE from "three";
import { UIManager } from "./ui/UIManager";
import { RenderingSystem } from "./core/rendering/RenderingSystem";
import { EventBus } from "./core/events/EventBus";
import { PhysicsSystem } from "./core/physics/PhysicsSystem";
import { Controller } from "./controller/Controller";
import { EntityManager } from "./core/ec-s/EntityManager";
import { LandingPlane } from "./entities/LandingPlane";
import { Starship } from "./entities/Starship";
import { Player } from "./entities/Player";
import { ScanOrb } from "./entities/ScanOrb";

// difference between a manager and a system?
// manager will have some of its own logic that controls its children
// - basically, managers have a little more coupling baked in than systems have to their children
// systems prompt their children to run their own logic
// systems should only contain logic that functions at the system level
// - for example: the physics system has logic that rotates the orientation of the world
// - this is system level logic
// - entities have their own updatePhysics logic that the system prompts them to run
// systems are used as a sync layer

export type GameMode = "loading" | "waiting" | "normal" | "gecko";

export class GameManager {
	// parent DOM element
	private readonly container: HTMLElement;
	// abstracted managers / systems
	private readonly entityManager: EntityManager;
	private readonly events: EventBus;
	private readonly controller: Controller;
	private readonly rendering: RenderingSystem;
	private readonly physics: PhysicsSystem;
	private readonly ui: UIManager; // non three rendered UI elements
	// ---
	public gameMode: GameMode = "loading";
	// ---
	private scanOrbPositions: THREE.Vector3[] = [
		new THREE.Vector3(0, 3, -5), // First checkpoint - near starting area
		new THREE.Vector3(0, -40, -72), // second checkpoint
	];
	private scanOrbIndex: number = 0;

	constructor(container: HTMLElement, setLoading: (loading: boolean) => void) {
		this.container = container;
		this.events = new EventBus();
		this.entityManager = new EntityManager(this.events);
		this.ui = new UIManager(this.events, this.container);
		this.physics = new PhysicsSystem(this.events, this.entityManager);
		this.rendering = new RenderingSystem(
			this.container,
			this.events,
			this.entityManager
		);
		this.controller = new Controller(this.events, this);

		this.initEventListeners(setLoading);
	}

	// Public getter for external event listening
	public get eventBus(): EventBus {
		return this.events;
	}

	// Public getter for physics errors count
	public get hasPhysicsErrors(): boolean {
		return this.ui.getPhysicsErrorsCount() > 0;
	}

	public dispose(): void {
		console.log("Destroying game manager");

		// --- Clean up managers and systems ---
		this.ui.dispose();
		this.controller.dispose();
		this.rendering.dispose();
		this.physics.dispose();
		// clean up entity manager near the end
		this.entityManager.dispose();
		// destroy event system last - some events may be emitted during destruction
		this.events.destroy();
	}

	// --- core init ---
	private initEventListeners(setLoading: (loading: boolean) => void): void {
		this.events.on(
			"change_game_mode_command",
			(args: { gameMode: GameMode }) => {
				const prev = this.gameMode;
				this.gameMode = args.gameMode;
				this.events.emit("game_mode_updated", {
					prev,
					curr: this.gameMode,
				});
				console.log(`Game mode changed from ${prev} to ${this.gameMode}`);
			}
		);

		this.events.on("physics_engine_initialized", () => {
			this.initializeGame(setLoading);
		});

		// start game
		this.events.on("start_game_command", () => {
			this.events.emit("change_game_mode_command", { gameMode: "normal" });
			this.initializeScanOrb();
			this.update(); // start the game loop
		});

		this.events.on("scan_orb_collision", () => {
			this.handleScanOrbCollision();
		});

		this.events.on("recreate_scan_orb_command", () => {
			this.handleRecreateScanOrb();
		});

		this.events.on("game_win_event", () => {
			// this.events.emit("change_game_mode_command", { gameMode: "gecko" });
		});
	}

	// --- event handlers ---
	private handleScanOrbCollision(): void {
		this.scanOrbIndex++;
		const scanOrb = this.entityManager.getEntity("scan_orb") as ScanOrb;

		if (this.scanOrbIndex >= this.scanOrbPositions.length) {
			// Game won - destroy and remove the scan orb
			console.log("All scan orbs collected! Player wins!");
			console.log("Destroying scan orb...");

			// Remove the scan orb from the entity manager (this will trigger proper cleanup)
			this.entityManager.removeEntity("scan_orb");

			// Emit game win event
			this.events.emit("game_win_event", undefined);
		} else {
			// Copy the position values instead of replacing the Vector3 reference
			const nextPosition = this.scanOrbPositions[this.scanOrbIndex];
			scanOrb.position.copy(nextPosition);
			console.log(
				`Moving scan orb to position ${this.scanOrbIndex}:`,
				nextPosition
			);
			this.events.emit("scan_orb_position_changed", undefined);
		}
	}

	// --- utility initializers ---
	private initializeScanOrb(): void {
		this.scanOrbIndex = 0;
		const scanOrb = new ScanOrb(this.events, this.scanOrbPositions[0]);
		this.entityManager.addEntity(scanOrb);
		console.log("GameManager: Scan orb created at position:", this.scanOrbPositions[0], "with floating offset:", scanOrb.floatingOffset);
	}

	private handleRecreateScanOrb(): void {
		console.log("GameManager: Recreating scan orb and resetting game");

		// Reset scan orb index to beginning
		this.scanOrbIndex = 0;

		// Reset UI celebration state
		this.ui.resetScanOrbCelebration();

		// Remove existing scan orb if it exists
		const existingScanOrb = this.entityManager.getEntity("scan_orb");
		if (existingScanOrb) {
			console.log("GameManager: Removing existing scan orb");
			this.entityManager.removeEntity("scan_orb");
		}

		// Add a small delay to ensure proper cleanup before recreating
		setTimeout(() => {
			console.log("GameManager: Creating new scan orb after cleanup delay");
			this.initializeScanOrb();
			console.log("GameManager: Scan orb recreated at starting position");
		}, 100); // 100ms delay to ensure cleanup completes
	}

	// --- game loop ---
	private update(): void {
		requestAnimationFrame(() => this.update());
		const deltaTime = this.rendering.clock.getDelta();
		this.physics.update(deltaTime);
		//rendering depends on physics, so update it after physics
		this.rendering.update(deltaTime);
	}

	// --- helpers ---
	private async initializeGame(
		setLoading: (loading: boolean) => void
	): Promise<void> {
		this.entityManager.addEntity(new LandingPlane(this.events));
		const starship = await Starship.create(this.events);
		this.entityManager.addEntity(starship);
		const player = await Player.create(this.events);
		this.entityManager.addEntity(player);
		this.rendering.update(0);
		this.events.emit("change_game_mode_command", {
			gameMode: "waiting",
		}); // @todo - update game mode to leave loading at appropriate location
		setLoading(false);
	}
}
