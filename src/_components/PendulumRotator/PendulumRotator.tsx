import React, { useRef, useEffect, useState } from "react";
import styles from "./pendulum.module.css";

export default function PendulumRotator(props: { children: React.ReactNode }) {
	const elementRef = useRef<HTMLDivElement>(null);

	const gravity = 9.81; // Acceleration due to gravity (m/s^2)
	const pendulumLength = 100000; // Length of the pendulum (meters)
	const initialAngle = 0; // Start at the highest point (0 radians)
	const initialAngularVelocity = 0.001 // Give it a small initial angular velocity

	const [angle, setAngle] = useState(initialAngle); // radians
	const [angularVelocity, setAngularVelocity] = useState(
		initialAngularVelocity
	);

	useEffect(() => {
		let animationFrameId: number | null = null;
		const timeStep = 0.016; // Time step for the simulation

		const updatePendulum = () => {
			// Calculate angular acceleration
			const angularAcceleration = (-gravity / pendulumLength) * Math.sin(angle);

			// Update angular velocity
			const newAngularVelocity =
				angularVelocity + angularAcceleration * timeStep;
			setAngularVelocity(newAngularVelocity);

			// Update angle
			const newAngle = angle + newAngularVelocity * timeStep;
			setAngle(newAngle);

			// Request the next frame
			animationFrameId = requestAnimationFrame(updatePendulum);
		};

		// Start the animation
		updatePendulum();

		// Cleanup function: Cancel the animation frame when the component unmounts
		return () => {
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}
		};
	}, [angle, angularVelocity, gravity, pendulumLength]); // Dependencies for useEffect

	// Apply the rotation style based on the current angle state
	useEffect(() => {
		if (elementRef.current) {
			elementRef.current.style.transform = `rotate(${
				(angle * 180) / Math.PI
			}deg)`;
		}
	}, [angle]); // Update transform when angle changes

	return (
		<div className={styles.rotatingElement} ref={elementRef}>
			{props.children}
		</div>
	);
}
