import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import { ProfilePage } from "../ProfilePage";
const api = vi.hoisted(() => ({
  getProfileSettings: vi.fn(),
  getDataDeletionStatus: vi.fn(),
  updateProfileSettings: vi.fn(),
  setConsent: vi.fn(),
  exportEmployeeData: vi.fn(),
  requestDataDeletion: vi.fn(),
  cancelDataDeletion: vi.fn(),
}));
vi.mock("../api", () => api);
const settings = {
  displayName: "Никита",
  locale: "ru" as const,
  region: "RU",
  phone: "+70000000000",
  birthDate: "1990-04-12",
  notificationEmail: true,
  notificationPush: false,
  organizationName: "Работодатель А",
  consents: [
    {
      type: "research" as const,
      granted: false,
      providerOrganizationId: null,
      providerName: null,
    },
  ],
  providers: [{ id: "provider-a", name: "Клиника А" }],
  devices: [
    {
      id: "device-a",
      label: "Chrome",
      lastSeenAt: "2026-08-20",
      current: true,
    },
  ],
  deletionRequest: null,
};
describe("ProfilePage", () => {
  beforeEach(() => {
    localStorage.setItem("vilu_language", "ru");
    vi.clearAllMocks();
    api.getProfileSettings.mockResolvedValue(settings);
    api.getDataDeletionStatus.mockResolvedValue({
      id: "delete-a",
      status: "requested",
      requestedAt: "2026-08-20",
      processedAt: null,
    });
    api.updateProfileSettings.mockResolvedValue(settings);
    api.setConsent.mockResolvedValue({});
    api.exportEmployeeData.mockResolvedValue({
      profile: settings,
      visionPassport: { screenings: [] },
    });
    api.requestDataDeletion.mockResolvedValue({
      id: "delete-a",
      status: "requested",
      requested_at: "2026-08-20",
      processed_at: null,
    });
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:test"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });
  it("edits region and birth date and grants only the selected clinic access", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <MemoryRouter
          initialEntries={["/ru/organizations/org-a/employee/profile"]}
        >
          <Routes>
            <Route
              path="/:locale/organizations/:organizationId/employee/profile"
              element={<ProfilePage />}
            />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>,
    );
    expect(await screen.findByText("Текущее устройство")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Регион"));
    await user.type(screen.getByLabelText("Регион"), "GB");
    await user.clear(screen.getByLabelText("Дата рождения"));
    await user.type(screen.getByLabelText("Дата рождения"), "1991-05-13");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(api.updateProfileSettings).toHaveBeenCalledWith(
      "org-a",
      expect.objectContaining({ region: "GB", birthDate: "1991-05-13" }),
    );
    await user.click(screen.getByRole("button", { name: "Разрешить доступ" }));
    expect(api.setConsent).toHaveBeenCalledWith(
      "org-a",
      "clinic_access",
      true,
      "provider-a",
    );
  });
  it("switches to the saved locale while preserving the profile route", async () => {
    const user = userEvent.setup();
    api.updateProfileSettings.mockResolvedValue({ ...settings, locale: "en" });
    render(
      <LanguageProvider>
        <MemoryRouter
          initialEntries={[
            "/ru/organizations/org-a/employee/profile?from=today#security",
          ]}
        >
          <Routes>
            <Route
              path="/:locale/organizations/:organizationId/employee/profile"
              element={<ProfilePage />}
            />
            <Route
              path="/en/organizations/org-a/employee/profile"
              element={<p>english-profile-route</p>}
            />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>,
    );
    await screen.findByText("Настройки и управление данными");
    await user.selectOptions(screen.getByLabelText("Язык"), "en");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(
      await screen.findByText("english-profile-route"),
    ).toBeInTheDocument();
  });
  it("exports data without showing a misleading profile saved badge", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <MemoryRouter
          initialEntries={["/ru/organizations/org-a/employee/profile"]}
        >
          <Routes>
            <Route
              path="/:locale/organizations/:organizationId/employee/profile"
              element={<ProfilePage />}
            />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>,
    );
    await screen.findByText("Настройки и управление данными");
    await user.click(
      screen.getByRole("button", { name: "Экспортировать мои данные" }),
    );
    expect(api.exportEmployeeData).toHaveBeenCalledWith("org-a");
    expect(screen.queryByText("Сохранено")).not.toBeInTheDocument();
  });
  it("leaves deletion processing to the server after the UI closes", async () => {
    const user = userEvent.setup();
    const view = render(
      <LanguageProvider>
        <MemoryRouter
          initialEntries={["/ru/organizations/org-a/employee/profile"]}
        >
          <Routes>
            <Route
              path="/:locale/organizations/:organizationId/employee/profile"
              element={<ProfilePage />}
            />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>,
    );
    await screen.findByText("Настройки и управление данными");
    await user.click(
      screen.getByRole("button", { name: "Запросить удаление данных" }),
    );
    expect(api.requestDataDeletion).toHaveBeenCalledWith("org-a");
    expect(await screen.findByText("Запрос получен")).toBeInTheDocument();
    view.unmount();
    expect(api.getDataDeletionStatus).toHaveBeenCalledWith("org-a", "delete-a");
  });
  it("does not offer another deletion after completion", async () => {
    api.getProfileSettings.mockResolvedValue({
      ...settings,
      deletionRequest: {
        id: "done",
        status: "completed",
        requestedAt: "2026-08-20",
        processedAt: "2026-08-21",
      },
    });
    render(
      <LanguageProvider>
        <MemoryRouter
          initialEntries={["/ru/organizations/org-a/employee/profile"]}
        >
          <Routes>
            <Route
              path="/:locale/organizations/:organizationId/employee/profile"
              element={<ProfilePage />}
            />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>,
    );
    expect(await screen.findByText("Данные удалены")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Запросить удаление данных" }),
    ).not.toBeInTheDocument();
  });
});
