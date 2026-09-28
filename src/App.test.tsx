import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "./test/renderApp";

describe("the app", () => {
  it("shows the Candidate the app's name", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "Interview Helper" })).toBeInTheDocument();
  });
});
