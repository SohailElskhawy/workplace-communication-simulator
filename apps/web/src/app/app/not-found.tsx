import { EmptyState } from "../../components/route-state";

export default function NotFound() {
  return (
    <div className="px-4 sm:px-6">
      <EmptyState
        title="Practice session not found"
        description="It may have been deleted or you may not have access to it."
      />
    </div>
  );
}
