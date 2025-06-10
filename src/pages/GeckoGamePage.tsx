import { useRef, useEffect, useState } from "react";
import { GameManager } from "@/src/gameplay/GameManager";
import GeckoLoader from "../_components/LoadingSpinner/GeckoLoader";

type GameStage = "loading" | "lobby" | "playing";

export default function GeckoGamePage() {
	const mountRef = useRef<HTMLDivElement>(null);
	const geckoGameRef = useRef<GameManager>(null);
	const [loading, setLoading] = useState(true);
	const [gameStage, setGameStage] = useState<GameStage>("loading");
	const [lobbyFadingOut, setLobbyFadingOut] = useState(false);
	const [startButtonFadingOut, setStartButtonFadingOut] = useState(false);

	useEffect(() => {
		// Ensure this code runs only on the client side
		if (typeof window === "undefined" || !mountRef.current) {
			return;
		}

		const geckoGame = new GameManager(mountRef.current, setLoading);
		geckoGameRef.current = geckoGame;

		// Cleanup function (runs on component unmount)
		return () => {
			if (geckoGameRef.current) {
				geckoGameRef.current.dispose();
				geckoGameRef.current = null;
			}
		};
	}, []); // Empty dependency array ensures this effect runs only once on mount and cleans up on unmount

	useEffect(() => {
		if (!loading && gameStage === "loading") {
			// Assets loaded, transition to lobby stage
			setGameStage("lobby");
		}
	}, [loading, gameStage]);

	const handleStartGame = () => {
		if (!geckoGameRef.current) return;

		// Start both fade-outs immediately when button is clicked
		setStartButtonFadingOut(true);
		setLobbyFadingOut(true);

		// Emit the start game command after a delay to allow fade-out
		setTimeout(() => {
			if (geckoGameRef.current) {
				geckoGameRef.current.eventBus.emit("start_game_command", undefined);
			}
			setGameStage("playing");
		}, 1000); // Slightly shorter than button fade to ensure smooth transition
	};

	return (
		<div
			style={{
				width: "100vw",
				height: "100vh",
				position: "relative",
			}}
		>
			{/* Three.js Scene Container */}
			<div
				ref={mountRef}
				style={{
					width: "100%",
					height: "100%",
					position: "relative",
					opacity: gameStage === "loading" ? 0 : 1,
					transition: "opacity 1.5s ease-in-out",
				}}
			/>

			{/* Loading Stage Overlay */}
			{gameStage === "loading" && (
				<div
					style={{
						position: "absolute",
						top: "0px",
						left: "0px",
						backgroundColor: "hsla(0, 0%, 15%, 1)", // Plain dark background
						width: "100vw",
						height: "100vh",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 10,
					}}
				>
					<GeckoLoader />
					<div
						style={{ marginTop: "24px", color: "white", textAlign: "center" }}
					>
						Loading Game Assets...
					</div>
					<div
						style={{ marginTop: "12px", color: "white", textAlign: "center" }}
					>
						I am hosting everything for free, so it may take a while. Hopefully
						I haven't gone over usage limits! Otherwise, you may be staring at
						this screen for a while.
					</div>
					<div
						style={{
							marginTop: "12px",
							color: "rgba(255,255,255,0.7)",
							textAlign: "center",
							fontSize: "14px",
						}}
					>
						This Game was not made for mobile devices. In order for gameplay to
						work, you must be on a desktop.
					</div>
				</div>
			)}

			{/* Lobby Stage Overlay */}
			{gameStage === "lobby" && (
				<div
					style={{
						position: "absolute",
						top: "0px",
						left: "0px",
						backdropFilter: "blur(4px)",
						backgroundColor: "hsla(0, 0%, 0%, 0.3)",
						width: "100vw",
						height: "100vh",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 5,
						opacity: lobbyFadingOut ? 0 : 1,
						transition: "opacity 1s ease-out",
						pointerEvents: lobbyFadingOut ? "none" : "auto",
					}}
				>
					{/* text container */}
					<div
						style={{
							filter: "drop-shadow(0 0 8em #646cffaa)",
							// backgroundColor: "hsla(0, 0%, 0%, 0.4)",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							padding: "12px",
							width: "40%",
						}}
					>
						<div
							style={{
								color: "white",
								fontSize: "32px",
								fontWeight: "bold",
								marginBottom: "16px",
								textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
							}}
						>
							Gecko Game
						</div>
						<div
							style={{
								color: "rgba(255,255,255,0.9)",
								textAlign: "center",
								marginBottom: "24px",
								textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
								fontSize: "20px",
							}}
						>
							Ready to begin your adventure?
						</div>
						<div
							style={{
								color: "rgba(255,255,255,0.9)",
								textAlign: "center",
								marginBottom: "4px",
								textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
								fontSize: "28px",
							}}
						>
							{"This game is still under development!"}
						</div>
						<div
							style={{
								color: "rgba(255,255,255,0.9)",
								textAlign: "center",
								textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
								fontSize: "12px",
								width: "100%",
							}}
						>
							{
								"(In the final version of this game, the robot will be able to walk around and stick to the walls of the ship, just like a gecko! There will be special locations on the ship that the robot will need to reach and scan to win the game.)"
							}
						</div>

						<div
							style={{
								color: "rgba(255,255,255,0.9)",
								textAlign: "center",
								marginTop: "8px",
								marginBottom: "32px",
								textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
								fontSize: "16px",
							}}
						>
							{"This game is not compatible with mobile devices."}
							<br />
							{"It must be played on a desktop."}
						</div>

						{/* Start Game Button */}
						<button
							onClick={handleStartGame}
							style={{
								padding: "12px 24px",
								backgroundColor: "hsla(0, 0%, 35%, 0.7)",
								color: "white",
								borderRadius: "5px",
								fontFamily: "Arial, sans-serif",
								fontSize: "16px",
								fontWeight: "bold",
								border: "1px solid rgba(255, 255, 255, 0.3)",
								cursor: "pointer",
								zIndex: "1001",
								opacity: startButtonFadingOut ? 0 : 1,
								transition: "opacity 1.5s ease, transform 0.2s ease",
								transform: "scale(1)",
								textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
							}}
							onMouseEnter={(e) => {
								if (!startButtonFadingOut) {
									e.currentTarget.style.transform = "scale(1.05)";
									e.currentTarget.style.backgroundColor =
										"hsla(0, 0%, 45%, 0.8)";
								}
							}}
							onMouseLeave={(e) => {
								if (!startButtonFadingOut) {
									e.currentTarget.style.transform = "scale(1)";
									e.currentTarget.style.backgroundColor =
										"hsla(0, 0%, 35%, 0.7)";
								}
							}}
						>
							Start Game
						</button>
					</div>
				</div>
			)}

			{/* Playing Stage - no overlay, just the game */}
		</div>
	);
}
