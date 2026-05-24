import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/api/client";

export function HealthBanner() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
  });

  if (isLoading) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        Checking backend connection…
      </p>
    );
  }

  if (isError) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Backend unreachable: {error instanceof Error ? error.message : "Unknown error"}
      </p>
    );
  }

  return (
    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      Connected to backend v{data.version} ({data.status})
    </p>
  );
}
