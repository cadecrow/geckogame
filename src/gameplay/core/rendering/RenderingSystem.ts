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
import { hasDisposeMethod } from "../../../Typeguards";
import {
	RenderingComponent,
	type IRenderableEntity,
} from "./RenderingComponent";
import type { EntityId } from "../ec-s/Entity";

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
		for (const entity in this.cachedEntities as IRenderableEntity[]) {
			(entity as unknown as IRenderableEntity).updateRendering(deltaTime);
		}
	}

	public dispose(): void {
		console.log("Destorying RenderingSystem");
		window.removeEventListener("resize", this.handleResize);

		this.populateCache();
		for (const entity in this.cachedEntities as IRenderableEntity[]) {
			// etf typescript compiler... why does it think entity is string?
			(entity as unknown as IRenderableEntity).disposeRendering();
		}

		// Clean up all objects in the scene
		this.disposeThreeSceneObjects();

		this.renderer.dispose();
		this.orbitControls.dispose();
	}

	// --- core init ---
	private initEventListeners(): void {
		this.events.on("entity_request_init_rendering", (payload) => {
			this.cachedEntities = null;
			this.initEntityRendering(payload.entityId);
		});
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

	private initEntityRendering(entityId: EntityId) {
		const entity = this.entityManager.getEntity(entityId) as IRenderableEntity;
		if (
			entity &&
			entity.hasComponent<RenderingComponent, IRenderableEntity>(
				RenderingComponent
			)
		) {
			entity.initRendering();
		}
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
