import { useRef, useEffect } from "react";
import { GameManager } from "@/src/gameplay/GameManager";

export default function GeckoGamePage() {
	const mountRef = useRef<HTMLDivElement>(null);
	const geckoGameRef = useRef<GameManager>(null);

	useEffect(() => {
		// Ensure this code runs only on the client side
		if (typeof window === "undefined" || !mountRef.current) {
			return;
		}

		const geckoGame = new GameManager(mountRef.current);
		geckoGameRef.current = geckoGame;

		// Cleanup function (runs on component unmount)
		return () => {
			if (geckoGameRef.current) {
				geckoGameRef.current.destroy();
				geckoGameRef.current = null;
			}
		};
	}, []); // Empty dependency array ensures this effect runs only once on mount and cleans up on unmount

	return (
		<div
			style={{
				width: "100vw",
				height: "100vh",
				padding: "2px",
			}}
		>
			<div
				ref={mountRef}
				style={{
					width: "100%",
					height: "100%",
					position: "relative",
				}}
			/>
		</div>
	);
}
