import * as THREE from "three";
import { Player } from "../entities/Player";

export class QuaternionVisualizer {
    private arrowHelper: THREE.ArrowHelper;
    private offset: THREE.Vector3;
    private player: Player;

    constructor(scene: THREE.Scene, player: Player, offset: THREE.Vector3) {
        this.player = player;
        
        // Create an arrow helper with initial direction pointing up
        const dir = new THREE.Vector3(0, 1, 0);
        const origin = new THREE.Vector3(0, 0, 0);
        const length = 0.75; // Slightly shorter length for better proportion
        const color = 0xffff00; // Yellow color
        const headLength = 0.2; // Length of the arrow head
        const headWidth = 0.1; // Width of the arrow head

        this.arrowHelper = new THREE.ArrowHelper(dir, origin, length, color, headLength, headWidth);
        this.offset = offset;
        
        scene.add(this.arrowHelper);
        
        // Start the update loop
        this.update();
    }

    public update(): void {
        // Update arrow position (offset above the character)
        const position = this.player.model.position;
        const quaternion = this.player.model.quaternion;
        
        const arrowPosition = position.clone().add(this.offset);
        this.arrowHelper.position.copy(arrowPosition);

        // Get the forward direction from the quaternion
        const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
        this.arrowHelper.setDirection(direction);
        
        // Request the next update
        requestAnimationFrame(() => this.update());
    }

    public dispose(): void {
        // Clean up Three.js objects
        if (this.arrowHelper) {
            if (this.arrowHelper.parent) {
                this.arrowHelper.parent.remove(this.arrowHelper);
            }
        }
    }
} 