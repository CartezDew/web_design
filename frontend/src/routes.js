import { index, route } from "@react-router/dev/routes";
export default [
  index("routes/home.jsx"),
  route("book/manage", "routes/manage-booking.jsx"),
  route("confirm", "routes/confirm.jsx"),
  route("sign-in", "routes/sign-in.jsx"),
  route("reset-password", "routes/reset-password.jsx"),
  route("accept-invitation", "routes/accept-invitation.jsx"),
  route("dashboard/*", "routes/dashboard.jsx"),
  route(":section/:slug?", "routes/legacy-section.jsx"),
  route("*", "routes/not-found.jsx"),
];
