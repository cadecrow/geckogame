import { Link } from "react-router";
import GeckoSvg from "../_components/svgs/gecko";
import defaultStyles from "@/src/_styles/default.module.css";

export default function HomePage() {
	return (
		<div
			style={{
				alignContent: "center",
				alignItems: "center",
				justifyItems: "center",
				textAlign: "center",
				height: "100vh",
				width: "100vw",
			}}
		>
			<Link
				to={"/gecko-game"}
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "8px",
				}}
				className={`${defaultStyles.hoverShadow}`}
			>
				<div className={`${defaultStyles.mirrorVertical}`}>
					<GeckoSvg />
				</div>
				<div>Click Here to Get Started</div>
			</Link>
		</div>
	);
}
