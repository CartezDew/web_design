import { processSteps } from "../content/site";
import Reveal from "../Reveal";
import "./Process.css";
export default function Process() {
  return (
    <section className="process section surface--espresso" id="process">
      <div className="shell">
        <p className="section-label">A simple, collaborative process</p>
        <Reveal>
          <h2>
            A clear path from idea to <em>launch.</em>
          </h2>
        </Reveal>
        <div className="process-steps">
          {processSteps.map(([title, copy], i) => (
            <Reveal as="article" key={title}>
              <span className="process-number" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
