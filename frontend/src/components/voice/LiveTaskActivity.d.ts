export interface LiveTask {
  id?: string;
  label: string;
  state: "processing" | "success" | "error";
  errorMsg?: string;
}

export interface LiveTaskActivityProps {
  task?: LiveTask | null;
  onDismiss?: () => void;
}

export declare function LiveTaskActivity(props: LiveTaskActivityProps): JSX.Element | null;
export default LiveTaskActivity;
