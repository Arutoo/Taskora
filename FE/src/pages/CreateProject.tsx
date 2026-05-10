import { motion } from "framer-motion";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createInviteLink, createWorkspace, inviteToWorkspace } from "../lib/api/workspaces";

type MemberRole = "leader" | "member";

type DirectoryEntry = {
  email: string;
};

type ProjectMember = {
  id: string;
  email: string;
  role: MemberRole;
};

export default function CreateProject() {
  const navigate = useNavigate();
  const [memberEmail, setMemberEmail] = useState("");
  const [members, setMembers] = useState<ProjectMember[]>([{ id: "leader", email: "You", role: "leader" }]);
  const [results, setResults] = useState<DirectoryEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldGenerateLink, setShouldGenerateLink] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const submitLock = useRef(false);

  const resultLabel = useMemo(() => {
    if (!memberEmail.trim()) return "";
    if (results.length > 0) return "Email ready to add";
    return "Enter an email to invite";
  }, [memberEmail, results.length]);

  const handleLookup = () => {
    const trimmed = memberEmail.trim().toLowerCase();
    if (!trimmed) return;
    setResults([{ email: trimmed }]);
  };

  const handleAddMember = (person: DirectoryEntry) => {
    if (members.some((m) => m.email === person.email)) return;
    setMembers((prev) => [...prev, { id: person.email, email: person.email, role: "member" }]);
    setMemberEmail("");
    setResults([]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || submitLock.current) return;
    submitLock.current = true;
    setIsSubmitting(true);
    setError(null);
    setLinkError(null);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const name = String(formData.get("name") ?? "").trim();
      const description = String(formData.get("description") ?? "").trim();

      const workspace = await createWorkspace({
        name,
        description: description ? description : undefined,
      });

      const invitees = members.filter((m) => m.role === "member").map((m) => m.email);
      if (invitees.length > 0) {
        const results = await Promise.allSettled(invitees.map((email) => inviteToWorkspace(workspace.id, email)));
        const failed = results.some((result) => result.status === "rejected");
        if (failed) {
          setError("Some invites failed. Make sure each email is registered.");
        }
      }

      let link: string | null = null;
      if (shouldGenerateLink) {
        const { inviteToken } = await createInviteLink(workspace.id);
        link = `${window.location.origin}/join/${workspace.id}?token=${inviteToken}`;
        setInviteLink(link);
      }

      navigate(`/project/${workspace.id}`, {
        replace: true,
        state: link ? { inviteLink: link } : undefined,
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
      setLinkError(null);
    } catch {
      setLinkError("Failed to copy link. Please copy it manually.");
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
                  onChange={(event) => setMemberEmail(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleLookup();
                    }
                  }}
                />
              </div>
              <button className="memberSearchBtn" type="button" onClick={handleLookup}>
                Add
              </button>
            </div>

            {resultLabel ? <p className="resultLabel">{resultLabel}</p> : null}

            <div className="memberResults">
              {results.map((person) => (
                <button
                  key={person.email}
                  type="button"
                  className="memberResultBtn"
                  onClick={() => handleAddMember(person)}
                >
                  <UserPlus size={14} />
                  {person.email}
                </button>
              ))}
            </div>
          </div>

          <div className="formField">
            <span className="formLabel">Invite Link</span>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--c-muted-foreground)" }}>
              <input
                type="radio"
                checked={shouldGenerateLink}
                onChange={(event) => setShouldGenerateLink(event.target.checked)}
              />
              Generate a shareable link after creating the project
            </label>
            {inviteLink ? (
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <input className="formInput" value={inviteLink} readOnly />
                <button className="ghostBtn" type="button" onClick={handleCopyLink}>
                  Copy link
                </button>
              </div>
            ) : null}
            {linkError ? <p className="muted" style={{ margin: "8px 0 0" }}>{linkError}</p> : null}
          </div>

          <div className="formActions">
            <button className="ghostBtn" type="button" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button className="primaryBtn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : shouldGenerateLink ? "Create & generate link" : "Create Project"}
            </button>
          </div>
          {error ? <p className="muted" style={{ margin: "12px 0 0" }}>{error}</p> : null}
        </form>
      </motion.div>
    </div>
  );
}
