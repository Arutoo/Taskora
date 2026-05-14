import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getWorkspace, joinWorkspace, joinWorkspaceWithToken } from "../lib/api/workspaces";

export default function JoinWorkspace() {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [inviteToken, setInviteToken] = useState(searchParams.get("token") ?? "");
  const [isLoading, setIsLoading] = useState(Boolean(workspaceId && searchParams.get("token")));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    const token = searchParams.get("token");
    if (!token) {
      setError("Enter the invite token shared by your workspace leader.");
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = inviteToken.trim();
    if (!token || isLoading) return;

    try {
      setIsLoading(true);
      setError(null);
      const workspace = await joinWorkspaceWithToken(token);
      navigate(`/project/${workspace.id}`, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to join workspace";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pageStack">
      <div className="createProjectShell">
        <div className="createProjectHeader">
          <h1 className="pageTitle">Join workspace</h1>
          <p className="pageSubtitle">Paste the invite token shared by your workspace leader.</p>
        </div>

        <form className="createProjectCard" onSubmit={handleSubmit}>
          <label className="formField">
            <span className="formLabel">Invite token</span>
            <textarea
              className="formInput formTextarea font-mono"
              value={inviteToken}
              onChange={(event) => setInviteToken(event.target.value)}
              placeholder="Paste invite token"
              autoComplete="off"
              disabled={isLoading}
            />
          </label>

          {error ? <p className="emptyStateText errorText" style={{ margin: 0 }}>{error}</p> : null}

          <div className="formActions">
            <button className="ghostBtn" type="button" onClick={() => navigate("/")}>
              Cancel
            </button>
            <button className="primaryBtn" type="submit" disabled={isLoading || !inviteToken.trim()}>
              {isLoading ? "Joining..." : "Join workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
