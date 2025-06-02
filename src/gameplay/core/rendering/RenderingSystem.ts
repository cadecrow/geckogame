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
			}
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
