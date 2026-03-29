export interface LandingPageInput {
  host: string;
  baseUrl: string;
  discordStatus: string;
  persistence: string;
  timestamp: string;
  installReady: boolean;
}

function badge(label: string, value: string): string {
  return `
    <div class="badge">
      <span class="badge-label">${label}</span>
      <span class="badge-value">${value}</span>
    </div>
  `;
}

export function renderLandingPage(input: LandingPageInput): string {
  const healthUrl = `${input.baseUrl}/health`;
  const apiUrl = `${input.baseUrl}/catalyst/health`;
  const installButton = input.installReady
    ? `<a class="primary" href="/invite">Install to Discord</a>`
    : `<span class="muted-pill">Set DISCORD_APPLICATION_ID to enable install links</span>`;
  const inviteStatus = input.installReady
    ? `<span class="success">302 Redirect</span>`
    : `<span class="warn">503 Install Disabled</span>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Catalyst Control Deck</title>
    <style>
      :root {
        --bg: #0a0d14;
        --panel: rgba(15, 22, 33, 0.86);
        --panel-border: rgba(117, 146, 191, 0.18);
        --text: #f2f5fb;
        --muted: #9aa8c7;
        --ice: #6ad6ff;
        --relay: #90a8ff;
        --ember: #ff8b67;
        --grid: rgba(120, 146, 196, 0.12);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "IBM Plex Mono", "Fira Code", "Consolas", monospace;
        color: var(--text);
        background:
          radial-gradient(circle at top, rgba(106, 214, 255, 0.08), transparent 30%),
          linear-gradient(180deg, rgba(17, 25, 39, 0.95), rgba(8, 10, 15, 1)),
          var(--bg);
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        background-image:
          linear-gradient(var(--grid) 1px, transparent 1px),
          linear-gradient(90deg, var(--grid) 1px, transparent 1px);
        background-size: 24px 24px;
        pointer-events: none;
        opacity: 0.35;
      }

      .shell {
        position: relative;
        width: min(1080px, calc(100% - 32px));
        margin: 32px auto;
        padding: 28px;
        border-radius: 24px;
        border: 1px solid var(--panel-border);
        background: var(--panel);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
        overflow: hidden;
      }

      .shell::after {
        content: "";
        position: absolute;
        inset: auto -10% -35% auto;
        width: 320px;
        height: 320px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 139, 103, 0.18), transparent 60%);
        pointer-events: none;
      }

      .topline {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-bottom: 28px;
        color: var(--muted);
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .status-dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        margin-right: 10px;
        border-radius: 999px;
        background: #54d38a;
        box-shadow: 0 0 12px rgba(84, 211, 138, 0.65);
      }

      h1 {
        margin: 0 0 12px;
        font-size: clamp(40px, 7vw, 76px);
        line-height: 0.95;
        letter-spacing: -0.04em;
        font-family: Georgia, "Times New Roman", serif;
      }

      .lede {
        max-width: 760px;
        margin: 0 0 28px;
        color: var(--muted);
        font-size: clamp(16px, 2vw, 20px);
        line-height: 1.7;
      }

      .grid {
        display: grid;
        grid-template-columns: 1.3fr 0.9fr;
        gap: 18px;
      }

      .card {
        position: relative;
        padding: 20px;
        border-radius: 18px;
        border: 1px solid rgba(122, 153, 197, 0.16);
        background: rgba(8, 12, 20, 0.86);
      }

      .card h2 {
        margin: 0 0 12px;
        font-size: 15px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ice);
      }

      .card p,
      .card li {
        color: var(--muted);
        line-height: 1.65;
      }

      .card ul {
        margin: 0;
        padding-left: 18px;
      }

      .badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 16px;
      }

      .badge {
        min-width: 160px;
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid rgba(122, 153, 197, 0.16);
        background: rgba(16, 22, 34, 0.95);
      }

      .badge-label {
        display: block;
        margin-bottom: 6px;
        color: var(--muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .badge-value {
        color: var(--text);
        font-size: 14px;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 18px;
      }

      .actions a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 18px;
        border-radius: 999px;
        color: var(--text);
        text-decoration: none;
        border: 1px solid rgba(122, 153, 197, 0.22);
        background: rgba(23, 32, 50, 0.96);
      }

      .actions a.primary {
        border-color: rgba(106, 214, 255, 0.42);
        background: linear-gradient(180deg, rgba(28, 57, 74, 0.95), rgba(14, 25, 39, 0.98));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      .muted-pill {
        display: inline-flex;
        align-items: center;
        min-height: 44px;
        padding: 0 18px;
        border-radius: 999px;
        color: var(--muted);
        border: 1px dashed rgba(122, 153, 197, 0.18);
        background: rgba(14, 20, 30, 0.7);
      }

      .terminal {
        margin-top: 18px;
        padding: 16px;
        border-radius: 14px;
        background: #06080d;
        color: #d9e7ff;
        font-size: 13px;
        line-height: 1.7;
        overflow: auto;
      }

      .terminal .prompt { color: var(--ice); }
      .terminal .path { color: var(--relay); }
      .terminal .success { color: #54d38a; }
      .terminal .warn { color: var(--ember); }

      @media (max-width: 860px) {
        .shell {
          margin: 14px auto;
          padding: 18px;
        }

        .grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <div class="topline">
        <div><span class="status-dot"></span>Catalyst Control Deck Online</div>
        <div>${input.timestamp}</div>
      </div>

      <h1>Catalyst is live.</h1>
      <p class="lede">
        This Railway domain is the hosted control surface for the Catalyst Discord app:
        season setup, board state, summaries, and health endpoints. The core product lives
        inside Discord, but this service is now online and responding.
      </p>

      <section class="grid">
        <article class="card">
          <h2>What This Service Does</h2>
          <p>
            Catalyst runs opt-in Discord seasons for creator and fandom communities.
            It powers join flows, leaderboard state, recap summaries, and admin setup
            while keeping the public web surface clean and minimal.
          </p>
          <div class="badge-row">
            ${badge('Discord Runtime', input.discordStatus)}
            ${badge('Persistence', input.persistence)}
            ${badge('Host', input.host)}
          </div>
          <div class="actions">
            ${installButton}
            <a href="/health">Open Health</a>
            <a href="/catalyst/health">Catalyst Health</a>
          </div>
        </article>

        <article class="card">
          <h2>Next Step</h2>
          <ul>
            <li>Install the Discord app to a test server.</li>
            <li>Run <strong>/setup</strong> to configure the control room.</li>
            <li>Run <strong>/season start</strong> to launch the first board.</li>
            <li>Use <strong>/summary channel</strong> or <strong>Summarize From Here</strong>.</li>
          </ul>
        </article>
      </section>

      <section class="terminal" aria-label="terminal status">
        <div><span class="prompt">GET</span> <span class="path">/health</span> <span class="success">200 OK</span></div>
        <div><span class="prompt">GET</span> <span class="path">/catalyst/health</span> <span class="success">200 OK</span></div>
        <div><span class="prompt">GET</span> <span class="path">/invite</span> ${inviteStatus}</div>
        <div><span class="prompt">MODE</span> <span class="path">discord-native hosted app</span></div>
        <div><span class="prompt">NOTE</span> <span class="warn">This domain is intentionally minimal. The real UX is in Discord.</span></div>
        <div><span class="prompt">CHECK</span> <span class="path">${healthUrl}</span></div>
        <div><span class="prompt">CHECK</span> <span class="path">${apiUrl}</span></div>
      </section>
    </main>
  </body>
</html>`;
}
