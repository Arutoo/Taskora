import { motion } from "framer-motion";
import { ArrowLeft, X, UserPlus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createInviteLink, createWorkspace, inviteToWorkspace } from "../lib/api/workspaces";
import { listUsers } from "../lib/api/users";
import { useAuth } from "../lib/use-auth";

type MemberRole = "leader" | "member";

type DirectoryEntry = {
  id: string;
  name: string;
  email: string;
};

type ProjectMember = {
  id: string;
  email: string;
  role: MemberRole;
};

export default function CreateProject() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [memberEmail, setMemberEmail] = useState("");
  const [members, setMembers] = useState<ProjectMember[]>([{ id: "leader", email: "You", role: "leader" }]);
  const [results, setResults] = useState<DirectoryEntry[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUpMember, setIsLookingUpMember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldGenerateCode, setShouldGenerateCode] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const submitLock = useRef(false);

  const inviteLink = inviteCode ? `${window.location.origin}/join?code=${encodeURIComponent(inviteCode)}` : "";

  const resultLabel = useMemo(() => {
    if (!memberEmail.trim()) return "";
    if (isLookingUpMember) return "Checking account...";
    if (lookupError) return lookupError;
    if (results.length > 0) return "Account found";
    return "Enter a registered teammate email";
  }, [isLookingUpMember, lookupError, memberEmail, results.length]);

  const handleLookup = async () => {
    const trimmed = memberEmail.trim().toLowerCase();
    if (!trimmed || isLookingUpMember) return;
    setLookupError(null);
    setResults([]);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setLookupError("Enter a valid email address");
      return;
    }

    try {
      setIsLookingUpMember(true);
      const users = await listUsers(trimmed);
      const match = users.find((entry) => entry.email.toLowerCase() === trimmed);
      if (!match || match.id === user?.id) {
        setLookupError("Account doesn't exist");
        return;
      }
      setResults([{ id: match.id, name: match.name, email: match.email }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not check account";
      setLookupError(message);
    } finally {
      setIsLookingUpMember(false);
    }
  };

  const handleAddMember = (person: DirectoryEntry) => {
    const email = person.email.trim().toLowerCase();
    if (members.some((m) => m.email.toLowerCase() === email)) return;
    setMembers((prev) => [...prev, { id: person.id, email: person.email, role: "member" }]);
    setMemberEmail("");
    setResults([]);
    setLookupError(null);
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers((prev) => prev.filter((member) => member.id !== memberId || member.role === "leader"));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || submitLock.current) return;
    submitLock.current = true;
    setIsSubmitting(true);
    setError(null);
    setCodeError(null);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const name = String(formData.get("name") ?? "").trim();
      const description = String(formData.get("description") ?? "").trim();

      const workspace = await createWorkspace({
        name,
        description: description ? description : undefined,
      });

      const invitees = members.filter((m) => m.role === "member").map((m) => m.email.trim());
      let inviteWarning: string | null = null;
      if (invitees.length > 0) {
        const results = await Promise.allSettled(invitees.map((email) => inviteToWorkspace(workspace.id, email)));
        const failed = results.filter((result) => result.status === "rejected");
        if (failed.length > 0) {
          inviteWarning = "Some invites failed. Make sure each email belongs to a registered user.";
        }
      }

      let code: string | null = null;
      if (shouldGenerateCode) {
        const { inviteCode } = await createInviteLink(workspace.id);
        code = inviteCode;
        setInviteCode(code);
      }

      navigate(`/project/${workspace.id}`, {
        replace: true,
        state: code || inviteWarning ? { inviteCode: code ?? undefined, inviteWarning: inviteWarning ?? undefined } : undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create workspace";
      setError(message);
      submitLock.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCodeError(null);
    } catch {
      setCodeError("Failed to copy link. Please copy it manually.");
    }
  };

  return (
    <div className="pageStack">
      <button className="linkButton" type="button" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} />
        Back
      </button>

      <motion.div
        className="createProjectShell"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="createProjectHeader">
          <h1 className="pageTitle">New Project</h1>
          <p className="pageSubtitle">Set up a workspace for your team to collaborate on tasks and resources.</p>
        </div>

        <form className="createProjectCard" onSubmit={handleSubmit}>
          <label className="formField">
            <span className="formLabel">Project Name</span>
            <input className="formInput" type="text" name="name" placeholder="e.g. Mobile App Redesign" required />
          </label>

          <label className="formField">
            <span className="formLabel">Description</span>
            <textarea
              className="formInput formTextarea"
              name="description"
              rows={3}
              placeholder="What's this project about?"
            />
          </label>

          <div className="formField">
            <span className="formLabel">Add Members</span>
            <div className="memberList">
              {members.map((member) => (
                <div key={member.id} className="memberChip">
                  <span className="memberAvatar">{member.email[0]}</span>
                  <span>{member.email}</span>
                  {member.role === "leader" ? <span className="leaderBadge">Leader</span> : null}
                  {member.role !== "leader" ? (
                    <button
                      className="removeChipBtn"
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      aria-label={`Remove ${member.email}`}
                    >
                      <X size={12} />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="memberSearch">
              <div className="memberInput">
                <UserPlus size={14} />
                <input
                  type="email"
                  placeholder="Enter teammate email"
                  value={memberEmail}
                  onChange={(event) => {
                    setMemberEmail(event.target.value);
                    setLookupError(null);
                    setResults([]);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleLookup();
                    }
                  }}
                />
              </div>
              <button className="memberSearchBtn" type="button" onClick={handleLookup} disabled={isLookingUpMember}>
                {isLookingUpMember ? "Checking..." : "Add"}
              </button>
            </div>

            {resultLabel ? (
              <p className={lookupError ? "resultLabel errorText" : "resultLabel"}>{resultLabel}</p>
            ) : null}

            <div className="memberResults">
              {results.map((person) => (
                <button
                  key={person.email}
                  type="button"
                  className="memberResultBtn"
                  onClick={() => handleAddMember(person)}
                >
                  <UserPlus size={14} />
                  {person.name} · {person.email}
                </button>
              ))}
            </div>
          </div>

          <div className="formField">
            <span className="formLabel">Invite Code</span>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--c-muted-foreground)" }}>
              <input
                type="checkbox"
                checked={shouldGenerateCode}
                onChange={(event) => setShouldGenerateCode(event.target.checked)}
              />
              Generate an invite code and shareable link after creating the project
            </label>
            {inviteCode ? (
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                <input className="formInput font-mono" value={inviteCode} readOnly />
                <input className="formInput font-mono" value={inviteLink} readOnly />
                <button className="ghostBtn" type="button" onClick={handleCopyLink}>
                  Copy link
                </button>
              </div>
            ) : null}
            {codeError ? <p className="muted" style={{ margin: "8px 0 0" }}>{codeError}</p> : null}
          </div>

          <div className="formActions">
            <button className="ghostBtn" type="button" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button className="primaryBtn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : shouldGenerateCode ? "Create & generate code" : "Create Project"}
            </button>
          </div>
          {error ? <p className="muted" style={{ margin: "12px 0 0" }}>{error}</p> : null}
        </form>
      </motion.div>
    </div>
  );
}
