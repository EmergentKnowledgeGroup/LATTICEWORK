import { LitElement, css, html } from "lit";

/**
 * A deliberately feature-free candidate boundary. Its status values are
 * supplied at boot and do not represent migrated legacy behavior.
 */
export class EmptyStatusShell extends LitElement {
  static override properties = {
    diagnosticsCount: { type: Number },
    kernelState: { type: String },
    lifecycleState: { type: String },
    ready: { type: Boolean, reflect: true }
  };

  declare diagnosticsCount: number;
  declare kernelState: string;
  declare lifecycleState: string;
  declare ready: boolean;

  constructor() {
    super();
    this.diagnosticsCount = 0;
    this.kernelState = "Pending";
    this.lifecycleState = "Pending";
    this.ready = false;
  }

  static override styles = css`
    :host {
      display: block;
      min-block-size: 100vh;
      background:
        linear-gradient(150deg, rgb(225 238 232 / 85%), transparent 44rem),
        #f2f5f1;
      color: #17221f;
    }

    main {
      display: grid;
      gap: 1.5rem;
      width: min(100% - 2rem, 72rem);
      margin-inline: auto;
      padding-block: clamp(2rem, 7vw, 6rem);
    }

    header {
      max-inline-size: 48rem;
    }

    .eyebrow {
      margin: 0 0 0.65rem;
      color: #286359;
      font-size: 0.875rem;
      font-weight: 750;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      color: #10251f;
      font-size: clamp(2.1rem, 8vw, 4.5rem);
      letter-spacing: -0.045em;
      line-height: 0.98;
    }

    .summary {
      max-inline-size: 62ch;
      margin: 1.25rem 0 0;
      color: #41534d;
      font-size: 1.0625rem;
    }

    .boundary {
      border-inline-start: 0.3rem solid #37766a;
      padding-inline-start: 1rem;
      color: #29423a;
      font-weight: 650;
    }

    dl {
      display: grid;
      gap: 0.75rem;
      margin: 0;
    }

    .status {
      min-block-size: 7.5rem;
      border: 1px solid #b8c8be;
      border-radius: 0.85rem;
      background: rgb(255 255 255 / 72%);
      padding: 1rem;
    }

    dt {
      color: #52665e;
      font-size: 0.8125rem;
      font-weight: 750;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    dd {
      margin: 0.65rem 0 0;
      color: #12372d;
      font-size: 1.25rem;
      font-weight: 700;
    }

    a {
      align-self: start;
      display: inline-flex;
      align-items: center;
      min-block-size: 2.75rem;
      color: #005f56;
      font-weight: 700;
      text-underline-offset: 0.2em;
    }

    a:hover {
      color: #003f3a;
    }

    a:focus-visible {
      outline: 0.2rem solid #005f56;
      outline-offset: 0.2rem;
    }

    .details {
      max-inline-size: 62ch;
      border-block-start: 1px solid #b8c8be;
      padding-block-start: 1rem;
      color: #41534d;
    }

    @media (min-width: 48rem) {
      dl {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (forced-colors: active) {
      :host {
        background: Canvas;
        color: CanvasText;
      }

      .status,
      .details {
        border-color: CanvasText;
        background: Canvas;
      }

      h1,
      .eyebrow,
      .summary,
      .boundary,
      dt,
      dd,
      .details,
      a {
        color: CanvasText;
      }

      a:focus-visible {
        outline-color: CanvasText;
      }
    }
  `;

  override render() {
    return html`
      <main
        aria-busy=${String(!this.ready)}
        aria-labelledby="candidate-title"
        data-ready=${this.ready ? "true" : "false"}
        data-testid="candidate-ready"
      >
        <header>
          <p class="eyebrow">LATTICEWORK / candidate boundary</p>
          <h1 id="candidate-title">Candidate status shell</h1>
          <p class="summary">
            This local-only view is a candidate architecture seam, not a replacement application.
          </p>
          <p class="boundary">Candidate only. No migrated features are available in this shell.</p>
        </header>

        <dl aria-label="Candidate boot status">
          <div class="status">
            <dt>Kernel</dt>
            <dd>${this.kernelState}</dd>
          </div>
          <div class="status">
            <dt>Lifecycle</dt>
            <dd>${this.lifecycleState}</dd>
          </div>
          <div class="status">
            <dt>Diagnostics</dt>
            <dd>${this.diagnosticsCount} recorded</dd>
          </div>
        </dl>

        <a href="#candidate-details">Read the candidate boundary</a>
        <p class="details" id="candidate-details">
          The preserved legacy runtime remains authoritative. This shell does not access storage,
          network services, providers, service workers, or migrated routes.
        </p>
      </main>
    `;
  }

  setCandidateStatus(status: {
    readonly diagnosticsCount: number;
    readonly kernelState: string;
    readonly lifecycleState: string;
  }): void {
    this.diagnosticsCount = status.diagnosticsCount;
    this.kernelState = status.kernelState;
    this.lifecycleState = status.lifecycleState;
    this.ready = true;
  }

  setBootFailure(): void {
    this.kernelState = "Blocked";
    this.lifecycleState = "Failed";
    this.ready = false;
  }
}

customElements.define("lw-empty-status-shell", EmptyStatusShell);
