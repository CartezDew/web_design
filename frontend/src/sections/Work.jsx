import { track } from "../analytics/client";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { portfolio } from "../content/site";
import { stories } from "../content/stories";
import Reveal from "../Reveal";
import "./Work.css";

export function ProjectCard({ project, index = 0 }) {
  const story = stories[project.slug];
  const [storyOpen, setStoryOpen] = useState(false);
  const { hash, key } = useLocation();
  const projectId = `project-${project.slug}`;
  const storyId = `${projectId}-story`;
  useEffect(() => {
    if (hash === `#${projectId}`) setStoryOpen(true);
  }, [hash, key, projectId]);
  return (
    <Reveal
      as="article"
      className={`work-item work-item--${project.slug}`}
      id={projectId}
      delay={index * 0.05}
      scale={0.98}
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
      <div className="work-actions">
        <button
          className="project-story-button"
          type="button"
          aria-expanded={storyOpen}
          aria-controls={storyId}
          data-analytics-id={`portfolio_${project.slug}`}
          onClick={() => { if (!storyOpen) track("portfolio_view", { project_id: project.slug }); setStoryOpen(!storyOpen); }}
        >
          Behind the project <ChevronDown size={17} aria-hidden="true" />
        </button>
        <a
          className="project-live-link"
          data-analytics-id={`portfolio_visit_${project.slug}`}
          href={project.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Visit ${project.title} website (opens a new tab)`}
        >
          Visit website <ArrowUpRight size={17} aria-hidden="true" />
        </a>
      </div>
      <div className="work-story" id={storyId} hidden={!storyOpen}>
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
      </div>
    </Reveal>
  );
}

export default function Work() {
  return (
    <section className="work section shell" id="work">
      <p className="section-label">Selected work</p>
      <Reveal className="section-heading" distance={20}>
        <h2>
          Good ideas.
          <br />
          Real-world work.
        </h2>
        <p>
          Different businesses. Different challenges. The same care for the
          details that make an experience work.
        </p>
      </Reveal>
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
