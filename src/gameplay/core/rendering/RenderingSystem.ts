import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EventSystem, EVENT } from "../events/EventBus";
import type { EventPayload } from "../events/EventBus";
import type { EntityId } from "../ec-s/Entity";
import { Entity } from "../ec-s/Entity";
import {
	initCamera,
	initDirectionalLight,
	initOrbitControls,
	initRenderer,
	initScene,
	styleCanvas,
} from "../utils/sceneInitializers";
import { initPointLight } from "../utils/sceneInitializers";
import { initAmbientLight } from "../utils/sceneInitializers";
import { hasDisposeMethod } from "../../../Typeguards";

export class RenderingSystem {
	private readonly container: HTMLElement;
	private readonly events: EventSystem;
	// ---
	private readonly gameEntities: Map<EntityId, Entity>;
	// ---
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;
	// ---
	public clock: THREE.Clock;
	public orbitControls: OrbitControls;

	constructor(
		container: HTMLElement,
		events: EventSystem,
		gameEntities: Map<EntityId, Entity>
	) {
		window.addEventListener("resize", this.handleResize);
		this.container = container;
		this.events = events;
		this.gameEntities = gameEntities;

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

	public destroy(): void {
		console.log("Destorying RenderingSystem");
		window.removeEventListener("resize", this.handleResize);

		for (const entity of this.gameEntities.values()) {
			entity.destroyRender();
		}

		// Clean up all entities in the scene
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
		this.renderer.dispose();

		// Clean up controls
		this.orbitControls.dispose();
	}

	// --- core init ---
	private initEventListeners(): void {
		this.events.on(
			EVENT.ENTITY_RENDER_INIT_REQUEST,
			(payload: EventPayload<typeof EVENT.ENTITY_RENDER_INIT_REQUEST>) => {
				const entity = this.gameEntities.get(payload.entityId);
				if (entity) {
					entity.initRender(this.scene, this.renderer, this.camera);
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

	public update(deltaTime: number): void {
		for (const entity of this.gameEntities.values()) {
			entity.updateRender(deltaTime);
		}

		this.renderer.render(this.scene, this.camera);
	}
}
