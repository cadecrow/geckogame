import GeckoSvg from "@/src/_components/svgs/gecko";
import defaultStyles from "@/src/_styles/default.module.css";
import styles from "./loading.module.css";
// import PendulumRotator from "../PendulumRotator/PendulumRotator";

export default function GeckoLoader() {
	return (
		// <PendulumRotator>
		<div className={styles.rotatingElement}>
			<div
				className={`${defaultStyles.hoverShadow} ${defaultStyles.mirrorVertical}`}
			>
				<GeckoSvg />
			</div>
		</div>
		// </PendulumRotator>
	);
}
