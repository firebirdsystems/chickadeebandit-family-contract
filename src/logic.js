/**
 * Pure business logic for the Family Contract app.
 * No DOM, no fetch — importable in both browser and test environments.
 */

export const STEP_TYPES = {
  video:       { label: "Watch a Video",      icon: "▶️",  bodyLabel: "Video URL",        bodyPlaceholder: "https://youtube.com/watch?v=..." },
  acknowledge: { label: "Read & Acknowledge", icon: "📖", bodyLabel: "Statement",        bodyPlaceholder: "I understand that a dog needs to be walked every day…" },
  commit:      { label: "Make a Commitment",  icon: "✍️",  bodyLabel: "Commitment Prompt", bodyPlaceholder: "I commit to walking the dog every morning before school." },
  cost:        { label: "Review Costs",       icon: "💰", bodyLabel: "Cost Breakdown",   bodyPlaceholder: "Food: ~$50/month\nVet visits: ~$200/year\nSupplies: ~$100 upfront" },
};

export const STATUS_INFO = {
  draft:        { cls: "status-draft",        label: "Draft" },
  active:       { cls: "status-active",       label: "Active" },
  child_signed: { cls: "status-child-signed", label: "Awaiting Parent" },
  completed:    { cls: "status-completed",    label: "Completed" },
  voided:       { cls: "status-voided",       label: "Voided" },
};

export function stepsComplete(steps) {
  return steps.every(s => s.completed_at);
}

export function nextIncompleteStep(steps) {
  return steps.find(s => !s.completed_at) ?? null;
}

export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}
