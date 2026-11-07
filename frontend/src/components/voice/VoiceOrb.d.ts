import { FC, KeyboardEvent, MouseEvent } from "react";

export interface VoiceOrbProps {
  status?: "listening" | "working" | "speaking" | "idle" | "unavailable";
  micLevel?: number;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export declare const VoiceOrb: FC<VoiceOrbProps>;
export default VoiceOrb;
