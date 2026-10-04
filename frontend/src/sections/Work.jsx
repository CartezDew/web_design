import { track } from "../analytics/client";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { portfolio } from "../content/site";
import { stories } from "../content/stories";
import Reveal from "../Reveal";
import "./Work.css";

export function ProjectCard({ project }) {
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
      distance={18}
      scale={0.98}
    >
      {/* The screenshot is a second, pointer-only way into the same live site; the
          labelled "Visit live site" link below is the accessible one. */}
      <a
        className="work-frame"
        href={project.url}
        target="_blank"
        rel="noreferrer"
        tabIndex={-1}
        aria-hidden="true"
        data-analytics-id={`portfolio_visit_${project.slug}`}
      >
        <span className="work-image">
          <img
            src={project.image}
            alt=""
            loading="lazy"
            width="1200"
            height="800"
          />
          <span className="work-visit-hint">
            Visit live site <ArrowUpRight size={16} />
          </span>
        </span>
      </a>
      <div className="work-caption">
        <div className="work-meta">
          <p>{project.category}</p>
        </div>
        <h3>{project.title}</h3>
        <span>{story.intro}</span>
      </div>
      <div className="work-actions">
        <a
          className="project-live-link"
          data-analytics-id={`portfolio_visit_${project.slug}`}
          href={project.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Visit ${project.title} website (opens a new tab)`}
        >
          Visit live site <ArrowUpRight size={17} aria-hidden="true" />
        </a>
        <button
          className="project-story-button"
          type="button"
          aria-expanded={storyOpen}
          aria-controls={storyId}
          data-analytics-id={`portfolio_${project.slug}`}
          onClick={() => {
            if (!storyOpen)
              track("portfolio_view", { project_id: project.slug });
            setStoryOpen(!storyOpen);
          }}
        >
          Behind the project <ChevronDown size={17} aria-hidden="true" />
        </button>
      </div>
      <div className="work-story" id={storyId} hidden={!storyOpen}>
        <div className="work-story-copy">
          <h4>The challenge</h4>
          <p>{story.challenge}</p>
          <h4>What I built</h4>
          <p>{story.approach}</p>
          <h4>What’s included</h4>
          <dl className="work-story-list">
            {story.included.map(([name, plain]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{plain}</dd>
              </div>
            ))}
          </dl>
          {story.tools?.length > 0 && (
            <>
              <h4>Tools behind it</h4>
              <dl className="work-story-list work-story-list--tools">
                {story.tools.map(([name, plain]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{plain}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
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

// On phones the grid becomes a swipe row. The current card is tracked with an
// observer rooted on the row itself, so there is no scroll listener.
function useCarousel(count) {
  const rowRef = useRef(null);
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const row = rowRef.current;
    if (!row || !("IntersectionObserver" in window)) return;
    // Keep the full set of visible cards: the current one is the leftmost. A
    // single "last intersecting" value goes stale when the layout switches
    // between grid and row.
    const visible = new Set();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = [...row.children].indexOf(entry.target);
          if (entry.isIntersecting) visible.add(index);
          else visible.delete(index);
        }
        if (visible.size) setCurrent(Math.min(...visible));
      },
      { root: row, threshold: 0.6 },
    );
    for (const card of row.children) io.observe(card);
    return () => io.disconnect();
  }, [count]);
  const go = (index) => {
    const row = rowRef.current;
    // Wraps both ways: next from the last card returns to the first, and back.
    const card = row?.children[((index % count) + count) % count];
    if (!card) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Scroll only the row (never the page) and land the card on the gutter.
    const gutter =
      parseFloat(getComputedStyle(row).scrollPaddingInlineStart) || 0;
    row.scrollTo({
      left:
        row.scrollLeft +
        card.getBoundingClientRect().left -
        row.getBoundingClientRect().left -
        gutter,
      behavior: reduce ? "auto" : "smooth",
    });
  };
  return { rowRef, current, go };
}

export default function Work() {
  const { rowRef, current, go } = useCarousel(portfolio.length);
  return (
    <section className="work section shell surface--paper" id="work">
      <p className="section-label">Selected work</p>
      <Reveal className="section-heading" distance={20}>
        <h2>
          Good ideas.
          <br />
          <em>Real-world</em> work.
        </h2>
        <p>
          Different businesses. Different challenges. The same care for the
          details that make an experience work.
        </p>
      </Reveal>
      <div className="work-toolbar">
        <p className="work-legend">
          Every project is a real, working website. Open any screenshot to visit
          it.
        </p>
        <div
          className="work-controls"
          role="group"
          aria-label="Browse projects"
        >
          <span className="work-count" aria-live="polite">
            {String(current + 1).padStart(2, "0")} /{" "}
            {String(portfolio.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            aria-label="Previous project"
            onClick={() => go(current - 1)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next project"
            onClick={() => go(current + 1)}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <div className="work-grid" ref={rowRef}>
        {portfolio.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
      <div className="work-dots" aria-hidden="true">
        {portfolio.map((project, index) => (
          <button
            key={project.slug}
            type="button"
            tabIndex={-1}
            data-active={index === current || undefined}
            onClick={() => go(index)}
          />
        ))}
      </div>
      <Reveal className="work-cta note-card note-card--sand" distance={16}>
        <p className="marker-line">
          Your business could be <em>next.</em>
        </p>
        <Link className="button button--red" to="/#start-a-project">
          Plan your website <ArrowRight size={18} />
        </Link>
      </Reveal>
    </section>
  );
}
