import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EventSystem, EVENT } from "../EventSystem";
import type { EventPayload } from "../EventSystem";
import type { EntityId } from "../entities/Entity";
import { Entity } from "../entities/Entity";
import { Player } from "../entities/Player";
// import { Starship } from "../entities/Starship";
import { LandingPlane } from "../entities/LandingPlane";
import { asyncAddModelToScene } from "./renderHelpers";

const BACKGROUND_COLOR = "hsl(0, 5%, 10%)";

export type RenderType = "kinematic" | "static";

const LIGHTS = {
	AMBIENT: "ambientLight",
	POINT: "pointLight",
	DIRECTIONAL: "directionalLight",
} as const;

export class RenderingManager {
	// meta members
	private container: HTMLElement;
	private events: EventSystem;
	private gameEntities: Map<EntityId, Entity>;

	// public members
	public clock: THREE.Clock;
	public orbitControls: OrbitControls;

	// local members
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;

	private lights: Map<(typeof LIGHTS)[keyof typeof LIGHTS], THREE.Light> =
		new Map();

	constructor(
		container: HTMLElement,
		events: EventSystem,
		gameEntities: Map<EntityId, Entity>
	) {
		window.addEventListener("resize", this.handleResize);

		// -- meta members
		this.events = events;
		this.container = container;
		// -- local members
		this.scene = new THREE.Scene();
		this.initScene();

		this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
		this.initCamera();

		this.renderer = new THREE.WebGLRenderer({
			antialias: true,
		});
		this.initRenderer();

		this.orbitControls = new OrbitControls(
			this.camera,
			this.renderer.domElement
		);
		this.initOrbitControls();

		// Style the canvas
		this.renderer.domElement.style.position = "absolute";
		this.renderer.domElement.style.top = "0";
		this.renderer.domElement.style.left = "0";
		this.renderer.domElement.style.width = "100%";
		this.renderer.domElement.style.height = "100%";

		this.container.appendChild(this.renderer.domElement);

		this.clock = new THREE.Clock();

		this.gameEntities = gameEntities;

		this.initEventListeners();

		this.init();
	}

	public destroy(): void {
		console.log("[RenderingManager] Destroying rendering manager");
		window.removeEventListener("resize", this.handleResize);

		// Clean up all entities in the scene
		while (this.scene.children.length > 0) {
			const object = this.scene.children[0];
			this.scene.remove(object);

			// Dispose of materials and geometries
			if (object instanceof THREE.Mesh) {
				if (object.geometry) {
					object.geometry.dispose();
				}
				if (object.material) {
					if (Array.isArray(object.material)) {
						object.material.forEach((material) => material.dispose());
					} else {
						object.material.dispose();
					}
				}
			}
		}

		// Clean up lights
		for (const light of this.lights.values()) {
			this.scene.remove(light);
		}
		this.lights.clear();

		// Clean up renderer
		this.renderer.dispose();

		// Clean up controls
		this.orbitControls.dispose();
	}

	// --- core init ---
	public init(): void {
		this.initEntities();
		this.clock.start();
		this.renderer.setAnimationLoop(this.update.bind(this));
	}

	private initEventListeners(): void {
		this.events.on(
			EVENT.ENTITY_MODEL_LOAD_SUCCESS,
			(payload: EventPayload<typeof EVENT.ENTITY_MODEL_LOAD_SUCCESS>) => {
				console.log(
					"[RenderingManager] Received model load success event for entity:",
					payload.entityId
				);

				// because of async model loading, we can end up with two models in the scene while in react strict mode

				// Check if an entity with this ID is already in the scene
				let entityExists = false;
				this.scene.traverse((object) => {
					if (
						object.userData &&
						object.userData.entityId === payload.entityId
					) {
						entityExists = true;
					}
				});

				if (entityExists) {
					console.log(
						`[RenderingManager] Entity ${payload.entityId} already exists in scene, skipping add`
					);
					return;
				}

				// Add entity ID to model's userData for future reference
				payload.model.userData = {
					...payload.model.userData,
					entityId: payload.entityId,
				};

				// Add the loaded model to the scene
				if (payload.entityId === "starship") {
					console.log("[RenderingManager] Adding starship model to scene");
					asyncAddModelToScene(
						payload.model,
						this.scene,
						this.renderer,
						this.camera
					);
				} else {
					console.log("[RenderingManager] Adding model directly to scene");
					this.scene.add(payload.model);
				}

				// Initialize quaternion visualizer for player
				if (payload.entityId === "player") {
					console.log(
						"[RenderingManager] Initializing player quaternion visualizer"
					);
					const player = this.gameEntities.get("player") as Player;
					if (player) {
						player.initQuaternionVisualizer(this.scene);
					}
				}
			}
		);

		this.events.on(
			EVENT.ENTITY_MODEL_LOAD_ERROR,
			this.onModelLoadError.bind(this)
		);

		// Handle entity disposal
		this.events.on(EVENT.ENTITY_DISPOSED, (payload: { entityId: string }) => {
			console.log(
				"[RenderingManager] Handling entity disposal:",
				payload.entityId
			);
			const entity = this.gameEntities.get(payload.entityId as EntityId);
			if (entity instanceof Player) {
				// Remove model from scene
				this.scene.remove(entity.model);
				// Dispose of any materials/geometries
				entity.model.traverse((child) => {
					if (child instanceof THREE.Mesh) {
						if (child.geometry) {
							child.geometry.dispose();
						}
						if (child.material) {
							if (Array.isArray(child.material)) {
								child.material.forEach((material) => material.dispose());
							} else {
								child.material.dispose();
							}
						}
					}
				});
			}
		});

		// Update transforms only for dynamic entities that need physics sync
		this.events.on(
			EVENT.ENTITY_PHYSICS_TRANSFORM_UPDATED,
			(payload: {
				entityId: string;
				position: THREE.Vector3;
				quaternion: THREE.Quaternion;
			}) => {
				const entity = this.gameEntities.get(payload.entityId as EntityId);
				if (entity?.physicsType === "dynamic" && entity instanceof Player) {
					// Update position
					if (!entity.model.position.equals(payload.position)) {
						entity.model.position.copy(payload.position);
					}

					// Update rotation - use a separate quaternion for smoother rotation
					if (!entity.model.quaternion.equals(payload.quaternion)) {
						// Directly apply physics quaternion for accurate rotation
						entity.model.quaternion.copy(payload.quaternion);

						// Occasionally log rotation for debugging
						if (Math.random() < 0.005) {
							const euler = new THREE.Euler().setFromQuaternion(
								payload.quaternion
							);
							console.log(
								"[RenderingManager] Player model rotation:",
								"X:",
								THREE.MathUtils.radToDeg(euler.x).toFixed(2),
								"Y:",
								THREE.MathUtils.radToDeg(euler.y).toFixed(2),
								"Z:",
								THREE.MathUtils.radToDeg(euler.z).toFixed(2)
							);
						}
					}
				}
			}
		);
	}

	// --- event handlers ---
	private handleResize = (): void => {
		if (!this.container) return;

		const width = this.container.clientWidth;
		const height = this.container.clientHeight;

		this.renderer.setSize(width, height);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
	};

	private onModelLoadError({
		entityId,
		error,
	}: {
		entityId: string;
		error: Error;
	}): void {
		console.error(`Failed to load model for entity ${entityId}:`, error);
	}

	// --- utility initializers ---
	private initScene(): void {
		this.scene.background = new THREE.Color(BACKGROUND_COLOR);
		this.addLightToScene(LIGHTS.POINT, this.initPointLight());
		this.addLightToScene(LIGHTS.AMBIENT, this.initAmbientLight());
		this.addLightToScene(LIGHTS.DIRECTIONAL, this.initDirectionalLight());
	}

	private initCamera(): void {
		this.camera.position.set(0, 8, 16);
		this.camera.aspect =
			this.container.clientWidth / this.container.clientHeight;
		this.camera.updateProjectionMatrix();
	}

	private initRenderer(): void {
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.setSize(
			this.container.clientWidth,
			this.container.clientHeight
		);
	}

	private initAmbientLight(): THREE.AmbientLight {
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
		return ambientLight;
	}

	private initPointLight(): THREE.PointLight {
		const pointLight = new THREE.PointLight(0xffffff, 1);
		pointLight.position.set(5, 5, 5);
		return pointLight;
	}

	private initDirectionalLight(): THREE.DirectionalLight {
		const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
		directionalLight.position.set(5, 10, 5);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.width = 2048;
		directionalLight.shadow.mapSize.height = 2048;
		directionalLight.shadow.camera.near = 1;
		directionalLight.shadow.camera.far = 50;
		directionalLight.shadow.camera.left = -15;
		directionalLight.shadow.camera.right = 15;
		directionalLight.shadow.camera.top = 15;
		directionalLight.shadow.camera.bottom = -15;

		return directionalLight;
	}

	private initOrbitControls(): void {
		this.orbitControls.enableDamping = true;
		this.orbitControls.dampingFactor = 0.1;
		this.orbitControls.enablePan = false;
		this.orbitControls.minDistance = 2;
		this.orbitControls.maxDistance = 30;
		this.orbitControls.target.set(0, 0.5, 0); // Look at character's head/center
		// Limit vertical angle so camera can't go below ground
		this.orbitControls.minPolarAngle = Math.PI / 6; // 30 deg
		this.orbitControls.maxPolarAngle = Math.PI / 1.2; // 150 deg
	}

	private initEntities(): void {
		// Only initialize the landing plane since it's not loaded asynchronously
		for (const entity of this.gameEntities.values()) {
			if (entity.id === "landing_plane") {
				const landingPlane = entity as LandingPlane;
				this.scene.add(landingPlane.mesh);
			}
		}

		// Initialize physics for landing plane
		const landingPlane = this.gameEntities.get("landing_plane") as LandingPlane;
		if (landingPlane) {
			this.events.emit(EVENT.ENTITY_MODEL_LOAD_SUCCESS, {
				entityId: landingPlane.id,
				model: new THREE.Group().add(landingPlane.mesh),
				animations: [], // No animations for landing plane
			});
		}
	}

	// --- interactions with class ---
	public addLightToScene(
		name: (typeof LIGHTS)[keyof typeof LIGHTS],
		light: THREE.Light
	): void {
		this.lights.set(name, light);
		this.scene.add(light);
	}

	public update(deltaTime: number): void {
		// Update animations
		for (const entity of this.gameEntities.values()) {
			switch (entity.id) {
				case "player":
					const player = entity as Player;
					if (player.mixer) {
						// Clamp deltaTime to avoid huge jumps
						const clampedDelta = Math.min(deltaTime, 1 / 30); // Max 30fps worth of time
						player.mixer.update(clampedDelta);
					}

					// Make the camera follow the player smoothly
					if (player.model && player.physicsType === "dynamic") {
						const playerPosition = player.model.position;
						// Set the orbit controls target to the player position
						// with slight height offset to look at player's upper body
						const targetPosition = new THREE.Vector3(
							playerPosition.x,
							playerPosition.y + 1.0, // Aim a bit higher than feet
							playerPosition.z
						);

						// Smoothly transition camera target
						this.orbitControls.target.lerp(targetPosition, 0.1);
						this.orbitControls.update();
					}
					break;
				case "starship":
					// const starship = entity as Starship;
					break;
				case "landing_plane":
					// const landingPlane = entity as LandingPlane;
					break;
			}
		}

		this.renderer.render(this.scene, this.camera);
	}
}
