import { processSteps } from "../content/site";
import Reveal from "../Reveal";
import "./Process.css";
export default function Process() {
  return (
    <section className="process section">
      <div className="shell">
        <p className="section-label">
          <span>04</span> A simple, collaborative process
        </p>
        <Reveal>
          <h2>A clear path from idea to launch.</h2>
        </Reveal>
        <div className="process-steps">
          {processSteps.map(([title, copy], i) => (
            <Reveal as="article" key={title} delay={i * 0.08}>
              <span>0{i + 1}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
