import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getWorkspace, joinWorkspace } from "../lib/api/workspaces";

export default function JoinWorkspace() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setError("Missing workspace ID.");
      setIsLoading(false);
      return;
    }

    const token = searchParams.get("token");
    if (!token) {
      setError("Missing invite token.");
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const join = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await joinWorkspace(workspaceId, token);
        if (isActive) {
          navigate(`/project/${workspaceId}`, { replace: true });
        }
      } catch (err) {
        try {
          await getWorkspace(workspaceId);
          if (isActive) {
            navigate(`/project/${workspaceId}`, { replace: true });
            return;
          }
        } catch {
          const message = err instanceof Error ? err.message : "Failed to join workspace";
          if (isActive) setError(message);
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    join();
    return () => {
      isActive = false;
    };
  }, [navigate, searchParams, workspaceId]);

  return (
    <div className="pageStack">
      {isLoading ? <p className="muted">Joining workspace...</p> : null}
      {error ? <p className="muted">{error}</p> : null}
    </div>
  );
}
