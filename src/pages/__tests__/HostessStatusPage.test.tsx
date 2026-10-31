import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { HostessStatusPage } from "../HostessStatusPage";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", exists: (key: string) => key.startsWith("ktvPos.") },
  }),
}));

const soon = new Date(Date.now() + 4 * 60000).toISOString();
const later = new Date(Date.now() + 42 * 60000).toISOString();

vi.mock("@/core/presentation/hooks/useHostessBoard", () => ({
  useHostessBoard: () => ({
    hostesses: [
      { id: "lily", name: "Lily", nickname: null, inRoom: null },
      { id: "snow", name: "Ma Hnin", nickname: "Snow", inRoom: { roomNumber: "V03", roomId: "room-3", until: later } },
      { id: "rose", name: "Ma Thiri", nickname: "Rose", inRoom: { roomNumber: "V05", roomId: "room-5", until: soon } },
    ],
    error: null,
    loaded: true,
  }),
}));

describe("HostessStatusPage", () => {
  it("lists hostesses soonest to finish first and opens a room", () => {
    render(
      <MemoryRouter initialEntries={["/hostesses"]}>
        <Routes>
          <Route path="/hostesses" element={<HostessStatusPage />} />
          <Route path="/ktv/room/:roomId" element={<p>room page</p>} />
        </Routes>
      </MemoryRouter>
    );

    const names = screen.getAllByRole("row").slice(1).map((row) => row.querySelector("td")?.textContent);
    expect(names).toEqual(["RoseMa Thiri", "SnowMa Hnin", "Lily"]);
    expect(screen.getByText("⚠ ktvPos.hostessLeft")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "V03" }));
    expect(screen.getByText("room page")).toBeInTheDocument();
  });
});
