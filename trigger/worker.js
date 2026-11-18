// Starts the AUR workflow (check-only, never forced) on two signals:
//   email:     GitHub's release notification for a watched upstream (arrives within seconds)
//   scheduled: hourly backstop, because GitHub drops most of its own scheduled runs
// Secrets: GH_TOKEN (fine-grained, Actions read/write on this repo only), FORWARD_TO (your inbox)

const dispatch = (env) =>
  fetch(`https://api.github.com/repos/${env.REPO}/actions/workflows/aur.yml/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "aur-trigger",
    },
    body: JSON.stringify({ ref: "main" }),
  }).then((r) => {
    if (!r.ok) throw new Error(`dispatch failed: ${r.status}`);
  });

export default {
  async email(message, env) {
    const from = message.headers.get("from") ?? "";
    const subject = message.headers.get("subject") ?? "";
    // Every GitHub notification lands here once this is the notification address; pass it on
    // first, so a failed dispatch never loses mail.
    await message.forward(env.FORWARD_TO);
    // "[owner/repo] Release v1.2.3 - title". A spoofed one only triggers a check-only run.
    if (from.includes("notifications@github.com") && /^\[[^\]]+\] Release /.test(subject)) {
      await dispatch(env);
    }
  },

  async scheduled(event, env) {
    await dispatch(env);
  },
};
