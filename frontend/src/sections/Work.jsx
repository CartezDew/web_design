import { ArrowUpRight, ChevronDown } from "lucide-react";
import { portfolio } from "../content/site";
import { stories } from "../content/stories";
import Reveal from "../Reveal";
import "./Work.css";

export function ProjectCard({ project, index = 0 }) {
  const story = stories[project.slug];
  return (
    <Reveal
      as="article"
      className={`work-item work-item--${project.slug}`}
      delay={index * 0.05}
    >
      <div className="work-image">
        <img
          src={project.image}
          alt={`${project.title} website`}
          loading="lazy"
          width="1200"
          height="800"
        />
      </div>
      <div className="work-caption">
        <p>{project.category}</p>
        <h3>{project.title}</h3>
        <span>{story.intro}</span>
      </div>
      <details className="work-story" id={`project-${project.slug}`}>
        <summary>
          Behind the project <ChevronDown size={17} />
        </summary>
        <div className="work-story-copy">
          <h4>The challenge</h4>
          <p>{story.challenge}</p>
          <h4>The approach</h4>
          <p>{story.approach}</p>
          <ul>
            {story.scope.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {story.note && <p>{story.note}</p>}
          {project.slug === "marcd" && (
            <a
              href="https://marc-d.com/our-story/"
              target="_blank"
              rel="noreferrer"
            >
              Read the Marc’d story ↗
            </a>
          )}
        </div>
      </details>
      <a
        className="text-link project-live-link"
        href={project.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Visit ${project.title} (opens a new tab)`}
      >
        Visit live project <ArrowUpRight size={16} />
      </a>
    </Reveal>
  );
}

export default function Work() {
  return (
    <section className="work section shell" id="work">
      <p className="section-label">
        <span>01</span> Selected work
      </p>
      <div className="section-heading">
        <h2>
          Good ideas.
          <br />
          Real-world work.
        </h2>
        <p>
          Different businesses. Different challenges. The same care for the
          details that make an experience work.
        </p>
      </div>
      <div className="work-grid">
        {portfolio.slice(0, 2).map((project, index) => (
          <ProjectCard key={project.slug} project={project} index={index} />
        ))}
      </div>
      <div className="work-grid work-grid--more">
        {portfolio.slice(2).map((project, index) => (
          <ProjectCard key={project.slug} project={project} index={index} />
        ))}
      </div>
    </section>
  );
}
