// import { PhysicsManager } from "./physics/PhysicsManager"; // Comment out for rendering checkpoint
import { UIManager } from "./ui/UIManager";
import { RenderingManager } from "./rendering/RenderingManager";
import { EVENT, EventSystem } from "./EventSystem";
import { Entity, ENTITY_REGISTRY } from "./entities/Entity";
import type { EntityId } from "./entities/Entity";
import { LandingPlane } from "./entities/LandingPlane";
import { Player } from "./entities/Player";
import { Starship } from "./entities/Starship";
import { Controller } from "./controller/Controller";
import { PhysicsManager } from "./physics/PhysicsManager";

export type GameMode = "normal" | "gecko";

export class GameManager {
	// parent DOM element
	private container: HTMLElement;

	// abstracted managers
	private events: EventSystem;
	private controller: Controller;
	private rendering: RenderingManager;
	private physics: PhysicsManager;
	private ui: UIManager; // non three rendered UI elements

	private readonly entities: Map<EntityId, Entity> = new Map();
	// ---
	public gameMode: GameMode = "normal";
	private isPhysicsInitialized = false;

	constructor(container: HTMLElement) {
		this.container = container;
		this.events = new EventSystem();
		this.ui = new UIManager(this.events, this.container);

		// Instantiate Entities
		this.entities.set(ENTITY_REGISTRY.player.id, new Player(this.events));
		this.entities.set(ENTITY_REGISTRY.starship.id, new Starship(this.events));
		this.entities.set(ENTITY_REGISTRY.landing_plane.id, new LandingPlane());

		this.controller = new Controller(this.events, this.gameMode);

		// pass controller and entities to rendering and physics managers
		this.rendering = new RenderingManager(
			this.container,
			this.events,
			this.entities
		);
		this.physics = new PhysicsManager(this.events, this.entities);
		this.rendering.init();
		
		// Listen for physics engine initialization
		this.events.on(EVENT.PHYSICS_ENGINE_INITIALIZED, this.onPhysicsInitialized.bind(this));

		this.initEventListeners();

		this.init();
	}

	private onPhysicsInitialized(): void {
		this.isPhysicsInitialized = true;
		console.log("[GameManager] Physics engine initialized");
	}

	public destroy(): void {
		console.log("[GameManager] Destroying game manager");

		// Clean up managers
		this.rendering.destroy();
		if (this.physics) this.physics.destroy();
		this.controller.cleanup();

		// Clean up event system last
		this.events.cleanup();
	}

	// --- core init ---
	private initEventListeners(): void {
		this.events.on(
			EVENT.CHANGE_GAME_MODE_COMMAND,
			(args: { gameMode: GameMode }) => {
				const prev = this.gameMode;
				this.gameMode = args.gameMode;
				this.events.emit(EVENT.GAME_MODE_UPDATED, {
					prev,
					curr: this.gameMode,
				});
			}
		);
	}

	private init(): void {
		// Start the game loop
		requestAnimationFrame(this.update.bind(this));
	}

	// --- event handlers ---

	private update(): void {
		const deltaTime = this.rendering.clock.getDelta();

		// Update all game systems
		if (this.isPhysicsInitialized) {
			this.physics.update();
		}
		
		this.rendering.update(deltaTime);
		
		// Continue the game loop
		requestAnimationFrame(this.update.bind(this));
	}
}
