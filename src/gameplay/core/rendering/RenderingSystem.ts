import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { EventBus } from "../events/EventBus";
import {
	initCamera,
	initDirectionalLight,
	initOrbitControls,
	initRenderer,
	initScene,
	styleCanvas,
	initPointLight,
	initAmbientLight,
} from "../utils/sceneInitializers";
import { System } from "../ec-s/System";
import type { EntityManager } from "../ec-s/EntityManager";
import { hasDisposeMethod } from "../../../_utils/Typeguards";
import {
	RenderingComponent,
	type IRenderableEntity,
} from "./RenderingComponent";

export class RenderingSystem extends System {
	private readonly container: HTMLElement;
	private readonly events: EventBus;
	// ---
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;
	private cachedEntities: IRenderableEntity[] | null = null; // null when cache invalid
	// ---
	public clock: THREE.Clock;
	public orbitControls: OrbitControls;
	// Camera following
	private cameraOffset: THREE.Vector3 = new THREE.Vector3(0, 8, 16); // Offset from player position
	private playerEntity: IRenderableEntity | null = null; // Reference to player for camera following

	constructor(container: HTMLElement, events: EventBus, eM: EntityManager) {
		super(eM);
		this.container = container;
		this.events = events;
		window.addEventListener("resize", this.handleResize);

		this.scene = initScene();
		this.scene.add(initPointLight());
		this.scene.add(initAmbientLight());
		this.scene.add(initDirectionalLight());

		this.camera = initCamera(this.container);

		this.renderer = initRenderer(this.container);
		styleCanvas(this.renderer.domElement); // make canvas fit container

		this.orbitControls = initOrbitControls(this.camera, this.renderer);

		this.container.appendChild(this.renderer.domElement);

		this.clock = new THREE.Clock();
		this.clock.start();

		this.initEventListeners();
	}

	public update(deltaTime: number): void {
		this.ensureValidCache();
		if (this.cachedEntities) {
			for (const entity of this.cachedEntities) {
				entity.updateRendering(
					deltaTime,
					this.scene,
					this.camera,
					this.renderer
				);
			}

			// Update camera to follow player
			this.updateCameraFollowing();

			this.renderer.render(this.scene, this.camera);
		}
	}

	public dispose(): void {
		console.log("Destroying RenderingSystem");
		window.removeEventListener("resize", this.handleResize);

		this.populateCache();
		if (this.cachedEntities) {
			for (const entity of this.cachedEntities) {
				entity.disposeRendering(this.scene, this.camera, this.renderer);
			}
		}

		// Clean up all objects in the scene
		this.disposeThreeSceneObjects();

		this.renderer.dispose();
		this.orbitControls.dispose();
	}

	// --- core init ---
	private initEventListeners(): void {
		this.events.on("entity_added_to_manager", (payload) => {
			if (payload.entity.hasComponent(RenderingComponent)) {
				this.cachedEntities = null;
				(payload.entity as IRenderableEntity).initRendering(
					this.scene,
					this.camera,
					this.renderer
				);

				// Check if this is the player entity for camera following
				if (payload.entity.id === "player") {
					this.playerEntity = payload.entity as IRenderableEntity;
					console.log(
						"RenderingSystem: Player entity registered for camera following"
					);
				}
			}

			this.events.on("entity_dispose_rendering_request", (payload) => {
				this.ensureValidCache();
				const entity = this.entityManager.getEntity(payload.entityId);
				if (entity && entity.hasComponent(RenderingComponent)) {
					(entity as IRenderableEntity).disposeRendering(
						this.scene,
						this.camera,
						this.renderer
					);
				}
			});
		});
	}

	private updateCameraFollowing(): void {
		if (!this.playerEntity) return;

		// Cast to access public forward direction
		const player = this.playerEntity as IRenderableEntity & {
			forwardDirection?: THREE.Vector3;
		};

		// Get player position
		const playerPosition = this.playerEntity.group.position;

		// Calculate camera offset based on player's forward direction
		const orientedOffset = this.cameraOffset.clone();

		// If player has forward direction, orient the camera offset relative to it
		if (player.forwardDirection) {
			// Create rotation from default forward (0,0,1) to player's forward direction
			const defaultForward = new THREE.Vector3(0, 0, 1);
			const rotationQuaternion = new THREE.Quaternion();
			rotationQuaternion.setFromUnitVectors(
				defaultForward,
				player.forwardDirection
			);

			// Apply rotation to camera offset
			orientedOffset.applyQuaternion(rotationQuaternion);
		}

		// Calculate target camera position (player position + oriented offset)
		const targetCameraPosition = new THREE.Vector3()
			.copy(playerPosition)
			.add(orientedOffset);

		// Calculate target look-at position (slightly above player)
		const targetLookAt = new THREE.Vector3()
			.copy(playerPosition)
			.add(new THREE.Vector3(0, 0.5, 0)); // Look at player's head/center

		// Update orbit controls target (what the camera looks at)
		this.orbitControls.target.copy(targetLookAt);

		// Set camera position
		this.camera.position.copy(targetCameraPosition);

		// Update orbit controls
		this.orbitControls.update();
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

	// --- HELPERS ---
	private ensureValidCache() {
		if (!this.cachedEntities) {
			this.populateCache();
		}
	}

	private populateCache() {
		this.cachedEntities = this.entityManager.getEntitiesHavingComponent<
			RenderingComponent,
			IRenderableEntity
		>(RenderingComponent);
	}

	private disposeThreeSceneObjects() {
		while (this.scene.children.length > 0) {
			const object = this.scene.children.pop();
			if (object) {
				this.scene.remove(object);
				if (object instanceof THREE.Group) {
					for (const child of object.children) {
						if (hasDisposeMethod(child)) {
							child.dispose();
						}
					}
				} else {
					if (hasDisposeMethod(object)) {
						object.dispose();
					}
				}
			}
		}
	}
}
