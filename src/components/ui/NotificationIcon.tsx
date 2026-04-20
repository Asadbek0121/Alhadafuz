import Lottie from "lottie-react";
import { useRef } from "react";
import animationData from "./wired-outline-3095-notification-letter-morph-close.json";

export default function NotificationIcon({ size = 24 }: { size?: number }) {
  const lottieRef = useRef<any>(null);

  return (
    <div
      style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => lottieRef.current?.play()}
      onMouseLeave={() => lottieRef.current?.stop()}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        autoplay={false}
        loop={false}
      />
    </div>
  );
}
