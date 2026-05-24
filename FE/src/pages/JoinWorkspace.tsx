import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getWorkspace, joinWorkspace, joinWorkspaceWithCode } from "../lib/api/workspaces";

export default function JoinWorkspace() {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCode = searchParams.get("code") ?? searchParams.get("token") ?? "";
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [isLoading, setIsLoading] = useState(Boolean(initialCode));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code") ?? searchParams.get("token");
    if (!code) {
      if (workspaceId) {
        setError("Enter the invite code shared by your workspace leader.");
        setIsLoading(false);
      }
      return;
    }

    setInviteCode(code);

    let isActive = true;
    const join = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const workspace = workspaceId
          ? await joinWorkspace(workspaceId, code)
          : await joinWorkspaceWithCode(code);
        if (isActive) {
          navigate(`/project/${workspace.id}`, { replace: true });
        }
      } catch (err) {
        if (!workspaceId) {
          const message = err instanceof Error ? err.message : "Failed to join workspace";
          if (isActive) setError(message);
          return;
        }

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
    const code = inviteCode.trim().toUpperCase();
    if (!code || isLoading) return;

    try {
      setIsLoading(true);
      setError(null);
      const workspace = await joinWorkspaceWithCode(code);
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
          <p className="pageSubtitle">Paste the invite code shared by your workspace leader.</p>
        </div>

        <form className="createProjectCard" onSubmit={handleSubmit}>
          <label className="formField">
            <span className="formLabel">Invite code</span>
            <input
              className="formInput font-mono"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              placeholder="AB12CD34"
              autoComplete="off"
              disabled={isLoading}
            />
          </label>

          {error ? <p className="emptyStateText errorText" style={{ margin: 0 }}>{error}</p> : null}

          <div className="formActions">
            <button className="ghostBtn" type="button" onClick={() => navigate("/")}>
              Cancel
            </button>
            <button className="primaryBtn" type="submit" disabled={isLoading || !inviteCode.trim()}>
              {isLoading ? "Joining..." : "Join workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
