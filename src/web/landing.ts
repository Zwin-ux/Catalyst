import type { CatalystModule } from '../catalyst/modules';

export interface LandingPageInput {
  host: string;
  baseUrl: string;
  discordStatus: string;
  persistence: string;
  timestamp: string;
  installReady: boolean;
  modules: CatalystModule[];
}

function escapeHtml(value: string): string {
  return value
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&#39;');
}

function badge(label: string, value: string): string {
  return `
    <div class="badge">
      <span class="badge-label">${escapeHtml(label)}</span>
      <span class="badge-value">${escapeHtml(value)}</span>
    </div>
  `;
}

function statusClass(status: CatalystModule['status']): string {
  switch (status) {
    case 'live':
      return 'status-live';
    case 'beta':
      return 'status-beta';
    default:
      return 'status-next';
  }
}

function renderModule(module: CatalystModule): string {
  const commands = module.commands.map((command) => `<code>${escapeHtml(command)}</code>`).join(' ');
  const hooks = module.hooks
    .slice(0, 3)
    .map((hook) => `<span class="hook">${escapeHtml(hook)}</span>`)
    .join('');

  return `
    <article class="module-card">
      <div class="module-topline">
        <span class="module-status ${statusClass(module.status)}">${escapeHtml(module.status)}</span>
        <span class="module-meta">${escapeHtml(module.category)} / ${escapeHtml(module.cadence)}</span>
      </div>
      <h3>${escapeHtml(module.name)}</h3>
      <p>${escapeHtml(module.description)}</p>
      <p class="module-why">${escapeHtml(module.whyItSticks)}</p>
      <div class="module-commands">${commands}</div>
      <div class="module-hooks">${hooks}</div>
    </article>
  `;
}

export function renderLandingPage(input: LandingPageInput): string {
  const healthUrl = `${input.baseUrl}/health`;
  const apiUrl = `${input.baseUrl}/catalyst/health`;
  const modulesUrl = `${input.baseUrl}/catalyst/modules`;
  const installButton = input.installReady
    ? `<a class="primary" href="/invite">Install to Discord</a>`
    : `<span class="muted-pill">Set DISCORD_APPLICATION_ID to enable install links</span>`;
  const inviteStatus = input.installReady
    ? `<span class="success">302 redirect</span>`
    : `<span class="warn">503 disabled</span>`;
  const liveCount = input.modules.filter((module) => module.status === 'live').length;
  const moduleCards = input.modules.map(renderModule).join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Catalyst - Discord Ritual Engine</title>
    <meta
      name="description"
      content="Catalyst is a Discord-native engagement engine for summaries, season boards, question loops, and plugin-shaped community rituals."
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --ink: #050608;
        --night: #0b0f14;
        --night-soft: #121823;
        --panel: rgba(10, 14, 20, 0.92);
        --panel-2: rgba(16, 22, 32, 0.88);
        --line: rgba(130, 151, 187, 0.18);
        --text: #f4f1e8;
        --muted: #a7b1c3;
        --signal: #66d6ff;
        --relay: #91a7ff;
        --ember: #ff8a63;
        --mint: #53d48c;
        --shell: #f4f1e8;
        --shell-ink: #0a0d12;
        --grid: rgba(112, 128, 154, 0.14);
      }

      * {
        box-sizing: border-box;
      }

      html {
        color-scheme: dark;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Instrument Sans", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top, rgba(102, 214, 255, 0.09), transparent 28%),
          linear-gradient(180deg, #101620 0%, #090d12 68%, #07090d 100%);
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        background-image:
          linear-gradient(var(--grid) 1px, transparent 1px),
          linear-gradient(90deg, var(--grid) 1px, transparent 1px);
        background-size: 26px 26px;
        opacity: 0.5;
        pointer-events: none;
      }

      a {
        color: inherit;
      }

      code {
        font-family: "IBM Plex Mono", monospace;
      }

      .page {
        position: relative;
        width: min(1180px, calc(100% - 28px));
        margin: 20px auto 40px;
      }

      .shell {
        border: 1px solid var(--line);
        border-radius: 28px;
        overflow: hidden;
        background: linear-gradient(180deg, rgba(9, 13, 19, 0.94), rgba(6, 8, 12, 0.98));
        box-shadow: 0 30px 90px rgba(0, 0, 0, 0.46);
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 22px;
        border-bottom: 1px solid var(--line);
        background: rgba(11, 15, 21, 0.9);
      }

      .brandline {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .brandline img {
        width: 42px;
        height: 42px;
        border-radius: 14px;
        background: var(--shell);
      }

      .brand-copy strong {
        display: block;
        font-size: 18px;
        letter-spacing: -0.02em;
      }

      .brand-copy span,
      .systemline {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
        gap: 20px;
        padding: 26px;
      }

      .hero-copy {
        padding: 8px 4px 4px;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border: 1px solid rgba(102, 214, 255, 0.18);
        border-radius: 999px;
        color: var(--signal);
        background: rgba(17, 28, 40, 0.7);
        font-family: "IBM Plex Mono", monospace;
        font-size: 12px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      h1 {
        margin: 18px 0 14px;
        max-width: 720px;
        font-family: "Instrument Serif", serif;
        font-size: clamp(44px, 6.6vw, 86px);
        line-height: 0.92;
        letter-spacing: -0.045em;
      }

      .lede {
        margin: 0;
        max-width: 700px;
        color: var(--muted);
        font-size: clamp(18px, 2vw, 22px);
        line-height: 1.65;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
      }

      .actions a,
      .muted-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        padding: 0 18px;
        border-radius: 999px;
        text-decoration: none;
        border: 1px solid rgba(130, 151, 187, 0.22);
        background: rgba(22, 31, 43, 0.92);
        color: var(--text);
        font-weight: 600;
      }

      .actions a.primary {
        border-color: rgba(102, 214, 255, 0.34);
        background: linear-gradient(180deg, rgba(26, 49, 67, 0.98), rgba(13, 21, 31, 0.98));
      }

      .muted-pill {
        color: var(--muted);
        border-style: dashed;
      }

      .badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 22px;
      }

      .badge {
        min-width: 152px;
        padding: 12px 14px;
        border-radius: 16px;
        border: 1px solid var(--line);
        background: rgba(16, 22, 32, 0.95);
      }

      .badge-label {
        display: block;
        margin-bottom: 6px;
        color: var(--muted);
        font-family: "IBM Plex Mono", monospace;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .badge-value {
        font-size: 14px;
      }

      .hero-side {
        display: grid;
        gap: 16px;
      }

      .slug-stage,
      .panel,
      .module-rack,
      .footer-grid {
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--panel);
      }

      .slug-stage {
        display: grid;
        gap: 16px;
        padding: 20px;
      }

      .slug-card {
        display: grid;
        place-items: center;
        min-height: 250px;
        border-radius: 22px;
        background:
          radial-gradient(circle at top, rgba(255, 255, 255, 0.24), transparent 42%),
          linear-gradient(180deg, #f7f2e7 0%, #ebe4d5 100%);
      }

      .slug-card img {
        width: min(100%, 260px);
        height: auto;
      }

      .slug-copy h2,
      .panel h2,
      .module-rack h2,
      .footer-grid h2 {
        margin: 0 0 12px;
        font-size: 13px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--signal);
      }

      .slug-copy p,
      .panel p,
      .panel li,
      .footer-grid p {
        margin: 0;
        color: var(--muted);
        line-height: 1.65;
      }

      .panel {
        padding: 18px;
      }

      .panel ul {
        margin: 0;
        padding-left: 18px;
      }

      .layout-grid {
        display: grid;
        grid-template-columns: 1.02fr 0.98fr;
        gap: 18px;
        padding: 0 26px 22px;
      }

      .module-rack {
        margin: 0 26px 22px;
        padding: 22px;
      }

      .module-rack-header {
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 16px;
        margin-bottom: 18px;
      }

      .module-rack-header p {
        margin: 0;
        max-width: 640px;
        color: var(--muted);
        line-height: 1.6;
      }

      .modules {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }

      .module-card {
        padding: 18px;
        border-radius: 20px;
        border: 1px solid rgba(130, 151, 187, 0.14);
        background: var(--panel-2);
      }

      .module-topline {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
        font-family: "IBM Plex Mono", monospace;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .module-status {
        padding: 5px 9px;
        border-radius: 999px;
        border: 1px solid transparent;
      }

      .status-live {
        color: var(--mint);
        border-color: rgba(83, 212, 140, 0.28);
        background: rgba(18, 47, 31, 0.5);
      }

      .status-beta {
        color: var(--signal);
        border-color: rgba(102, 214, 255, 0.28);
        background: rgba(15, 31, 40, 0.55);
      }

      .status-next {
        color: var(--ember);
        border-color: rgba(255, 138, 99, 0.28);
        background: rgba(52, 27, 20, 0.52);
      }

      .module-meta {
        color: var(--muted);
      }

      .module-card h3 {
        margin: 0 0 10px;
        font-size: 22px;
        letter-spacing: -0.02em;
      }

      .module-card p {
        margin: 0 0 12px;
        color: var(--muted);
        line-height: 1.62;
      }

      .module-why {
        color: var(--text) !important;
      }

      .module-commands {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 14px;
      }

      .module-commands code,
      .hook {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid rgba(130, 151, 187, 0.18);
        background: rgba(9, 14, 20, 0.95);
        color: var(--text);
        font-size: 12px;
      }

      .module-hooks {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .footer-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
        margin: 0 26px 26px;
        padding: 20px;
      }

      .terminal {
        padding: 18px;
        border-radius: 20px;
        background: #05070b;
        font-family: "IBM Plex Mono", monospace;
        font-size: 13px;
        line-height: 1.7;
      }

      .prompt {
        color: var(--signal);
      }

      .path {
        color: var(--relay);
      }

      .success {
        color: var(--mint);
      }

      .warn {
        color: var(--ember);
      }

      @media (max-width: 1040px) {
        .hero,
        .layout-grid,
        .footer-grid,
        .modules {
          grid-template-columns: 1fr;
        }

        .module-rack-header,
        .topbar {
          align-items: start;
          flex-direction: column;
        }
      }

      @media (max-width: 720px) {
        .page {
          width: min(100% - 14px, 100%);
          margin-top: 8px;
        }

        .hero,
        .layout-grid,
        .module-rack,
        .footer-grid {
          padding-left: 16px;
          padding-right: 16px;
          margin-left: 0;
          margin-right: 0;
        }

        .hero {
          padding-top: 18px;
        }

        .topbar {
          padding: 16px;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="shell">
        <div class="topbar">
          <div class="brandline">
            <img src="/assets/brand/catalyst-slug-app-icon.svg" alt="Catalyst black slug mark" />
            <div class="brand-copy">
              <strong>Catalyst</strong>
              <span>Discord-native ritual engine</span>
            </div>
          </div>
          <div class="systemline">Hosted on Railway / Discord-first / Plugin-shaped</div>
        </div>

        <section class="hero">
          <div class="hero-copy">
            <div class="eyebrow">Black slug silhouette / high-signal room design</div>
            <h1>Discord rituals, summaries, and season loops people actually keep installed.</h1>
            <p class="lede">
              Catalyst gives a room one clean operating system: joinable seasons, question loops,
              sharp recaps, and a module rack built for custom plugins later. It stays consent-first,
              stays Discord-native, and keeps the public web surface minimal.
            </p>
            <div class="actions">
              ${installButton}
              <a href="/catalyst/modules">View Module Rack</a>
              <a href="/health">Open Health</a>
            </div>
            <div class="badge-row">
              ${badge('Discord Runtime', input.discordStatus)}
              ${badge('Persistence', input.persistence)}
              ${badge('Live Modules', `${liveCount} live / ${input.modules.length} total`)}
              ${badge('Host', input.host)}
            </div>
          </div>

          <aside class="hero-side">
            <section class="slug-stage">
              <div class="slug-card">
                <img src="/assets/brand/catalyst-slug-mark.svg" alt="Catalyst slug mascot" />
              </div>
              <div class="slug-copy">
                <h2>Brand Thesis</h2>
                <p>
                  Catalyst should feel like a nocturnal mascot console: sly, premium, and clear.
                  The black slug gives the product a memorable silhouette without turning it into a toy.
                </p>
              </div>
            </section>

            <section class="panel">
              <h2>What People Install It For</h2>
              <ul>
                <li>Question loops that restart dead channels with one strong prompt.</li>
                <li>Season boards that create visible team momentum without hidden scoring.</li>
                <li>Fast summaries that collapse scrollback into something mods can act on.</li>
              </ul>
            </section>
          </aside>
        </section>

        <section class="layout-grid">
          <article class="panel">
            <h2>How The Room Uses It</h2>
            <p>
              Install the app, run <code>/setup</code>, launch a board with <code>/season start</code>,
              then keep the room warm with <code>/ritual prompt</code>, <code>/summary channel</code>,
              and a visible join flow. The product lives inside Discord, not in a generic admin dashboard.
            </p>
          </article>

          <article class="panel">
            <h2>Plugin Shape</h2>
            <p>
              Catalyst is growing toward a real module engine: stable hooks for rituals, summaries,
              showdowns, and custom community logic. The goal is simple: the same core shell, different
              games per community.
            </p>
          </article>
        </section>

        <section class="module-rack">
          <div class="module-rack-header">
            <div>
              <h2>Module Rack</h2>
              <p>
                The product story is no longer just "a Discord bot." It is a rack of installable
                behaviors: live modules now, beta slots for plugin logic, and a clear path to a fuller engine.
              </p>
            </div>
            <a href="/catalyst/modules">JSON manifest</a>
          </div>
          <div class="modules">
            ${moduleCards}
          </div>
        </section>

        <section class="footer-grid">
          <article>
            <h2>Control Deck</h2>
            <p>
              The public domain stays lean on purpose. Use it to install, inspect health, and verify the
              hosted runtime. The actual product surface is in Discord where the community already lives.
            </p>
          </article>

          <article class="terminal" aria-label="terminal status">
            <div><span class="prompt">GET</span> <span class="path">/health</span> <span class="success">200 ok</span></div>
            <div><span class="prompt">GET</span> <span class="path">/catalyst/health</span> <span class="success">200 ok</span></div>
            <div><span class="prompt">GET</span> <span class="path">/catalyst/modules</span> <span class="success">200 ok</span></div>
            <div><span class="prompt">GET</span> <span class="path">/invite</span> ${inviteStatus}</div>
            <div><span class="prompt">CHECK</span> <span class="path">${escapeHtml(healthUrl)}</span></div>
            <div><span class="prompt">CHECK</span> <span class="path">${escapeHtml(apiUrl)}</span></div>
            <div><span class="prompt">CHECK</span> <span class="path">${escapeHtml(modulesUrl)}</span></div>
            <div><span class="prompt">STAMP</span> <span class="path">${escapeHtml(input.timestamp)}</span></div>
          </article>
        </section>
      </section>
    </main>
  </body>
</html>`;
}
