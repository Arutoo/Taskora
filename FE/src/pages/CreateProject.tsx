import { motion } from "framer-motion";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createWorkspace, inviteToWorkspace } from "../lib/api/workspaces";

const COLOR_OPTIONS = ["#3FE0CA", "#7C5CFF", "#FF6AA2", "#F7B441", "#36D38E", "#5AA7FF"] as const;

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
  const [selectedColor, setSelectedColor] = useState<(typeof COLOR_OPTIONS)[number]>(COLOR_OPTIONS[0]);
  const [memberEmail, setMemberEmail] = useState("");
  const [members, setMembers] = useState<ProjectMember[]>([{ id: "leader", email: "You", role: "leader" }]);
  const [results, setResults] = useState<DirectoryEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

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
        await Promise.allSettled(invitees.map((email) => inviteToWorkspace(workspace.id, email)));
      }

      navigate(-1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create workspace";
      setError(message);
    } finally {
      setIsSubmitting(false);
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
            <span className="formLabel">Project Color</span>
            <div className="colorRow">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={color === selectedColor ? "colorSwatch active" : "colorSwatch"}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                  aria-label={`Select ${color} color`}
                />
              ))}
            </div>
          </div>

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

          <div className="formActions">
            <button className="ghostBtn" type="button" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button className="primaryBtn" type="submit">
              {isSubmitting ? "Creating..." : "Create Project"}
            </button>
          </div>
          {error ? <p className="muted" style={{ margin: "12px 0 0" }}>{error}</p> : null}
        </form>
      </motion.div>
    </div>
  );
}
