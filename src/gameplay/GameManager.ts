import { UIManager } from "./ui/UIManager";
import { RenderingSystem } from "./core/rendering/RenderingSystem";
import { EVENT, EventSystem } from "./core/events/EventSystem";
import { PhysicsSystem } from "./core/physics/PhysicsSystem";
import { Entity, type EntityId } from "./core/entity/Entity";
import { LandingPlane } from "./entities/LandingPlane";
import { Player } from "./entities/Player";
import { Starship } from "./entities/Starship";
import { Controller } from "./controller/Controller";

// difference between a manager and a system?
// manager will have some of its own logic that controls its children
// - basically, managers have a little more coupling baked in than systems have to their children
// systems prompt their children to run their own logic
// systems should only contain logic that functions at the system level
// - for example: the physics system has logic that rotates the orientation of the world
// - this is system level logic
// - entities have their own updatePhysics logic that the system prompts them to run
// systems are used as a sync layer

export type GameMode = "loading" | "normal" | "gecko";

export class GameManager {
	// parent DOM element
	private readonly container: HTMLElement;
	// abstracted managers
	private readonly events: EventSystem;
	private readonly controller: Controller;
	private readonly rendering: RenderingSystem;
	private readonly physics: PhysicsSystem;
	private readonly ui: UIManager; // non three rendered UI elements
	// ---
	public gameMode: GameMode = "loading";
	private readonly entities: Map<EntityId, Entity> = new Map();
	// ---

	constructor(container: HTMLElement) {
		this.container = container;
		this.events = new EventSystem();
		this.ui = new UIManager(this.events, this.container);
		this.physics = new PhysicsSystem(this.events, this.entities);
		this.rendering = new RenderingSystem(
			this.container,
			this.events,
			this.entities
		);
		this.controller = new Controller(this.events, this.gameMode);

		// Instantiate Entities
		// this.entities.set("player", new Player(this.events));
		// this.entities.set("starship", new Starship(this.events));
		this.entities.set("landing_plane", new LandingPlane());

		this.initEventListeners();
	}

	public destroy(): void {
		console.log("Destroying game manager");

		// Clean up managers
		// this.controller.destroy();
		this.rendering.destroy();
		if (this.physics) this.physics.destroy();

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

	// --- event handlers ---

	private update(): void {
		requestAnimationFrame(() => this.update());
		const deltaTime = this.rendering.clock.getDelta();
		this.physics.update(deltaTime);
		this.rendering.update(deltaTime);
	}
}
