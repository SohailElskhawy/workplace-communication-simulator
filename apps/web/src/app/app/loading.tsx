import { LoadingState } from "../../components/route-state";

export default function Loading() {
  return (
    <div className="px-4 sm:px-6">
      <LoadingState label="Loading your practice workspace…" />
    </div>
  );
}
