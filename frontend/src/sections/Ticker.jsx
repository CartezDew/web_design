import { Fragment } from "react";
import { Link } from "react-router-dom";
import { tickerItems } from "../content/ticker";
import "./Ticker.css";
export default function Ticker() {
  return (
    <section className="ticker surface--espresso" aria-label="Capabilities">
      <div className="ticker-window">
        <div className="ticker-track">
          {[0, 1].map((group) => (
            <div
              className="ticker-group"
              aria-hidden={group === 1 || undefined}
              inert={group === 1 || undefined}
              key={group}
            >
              {tickerItems.map((item) => (
                <Fragment key={item.label}>
                  <Link
                    className="ticker-item"
                    to={`/#service-${item.service}`}
                    tabIndex={group === 1 ? -1 : 0}
                    aria-label={`${item.label}. Learn more under What I do.`}
                  >
                    {item.label}
                  </Link>
                  <span className="ticker-divider" aria-hidden="true">
                    ✦
                  </span>
                </Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
