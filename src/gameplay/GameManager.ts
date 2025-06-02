import { UIManager } from "./ui/UIManager";
import { RenderingSystem } from "./core/rendering/RenderingSystem";
import { EventBus } from "./core/events/EventBus";
import { PhysicsSystem } from "./core/physics/PhysicsSystem";
import { Controller } from "./controller/Controller";
import { EntityManager } from "./core/ec-s/EntityManager";
import { LandingPlane } from "./entities/LandingPlane";
import { Starship } from "./entities/Starship";
import { Player } from "./entities/Player";

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
			this.update(); // start the game loop
		});
	}

	// --- event handlers ---

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
