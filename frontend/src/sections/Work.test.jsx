import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { portfolio } from "../content/site";
import { ProjectCard } from "./Work";

it("opens a linked project story and keeps its disclosure keyboard accessible", () => {
  render(
    <MemoryRouter initialEntries={["/#project-marcd"]}>
      <ProjectCard project={portfolio[0]} />
    </MemoryRouter>,
  );
  const button = screen.getByRole("button", { name: "Behind the project" });
  expect(button).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText("The challenge")).toBeVisible();
  fireEvent.click(button);
  expect(button).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByText("The challenge")).not.toBeVisible();
  expect(
    screen.getByRole("link", {
      name: "Visit Marc’d website (opens a new tab)",
    }),
  ).toHaveAttribute("href", portfolio[0].url);
});
