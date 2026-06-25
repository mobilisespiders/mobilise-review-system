import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("react-router-dom", () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ element }) => element,
}), { virtual: true });

jest.mock("./components/Dashboard", () => function MockDashboard() {
  return <div>Admin Dashboard</div>;
});

test("renders the dashboard route", () => {
  render(<App />);
  expect(screen.getByText(/admin dashboard/i)).toBeInTheDocument();
});
