import { createContext, useContext, useMemo, useState } from "react";

const LeadContactContext = createContext(null);

// One in-memory contact draft for the intake and consultation forms.
// Refreshing/leaving the landing page clears it; nothing is stored in the browser.
export function LeadContactProvider({ children }) {
  const [contact, setContact] = useState({
    name: "",
    first_name: "",
    last_name: "",
    email: "",
  });
  const value = useMemo(
    () => ({
      contact,
      updateContact(field, value) {
        setContact((current) => {
          if (field === "name") {
            const [first_name = "", ...rest] = value.trim().split(/\s+/);
            return {
              ...current,
              name: value,
              first_name,
              last_name: rest.join(" "),
            };
          }
          const next = { ...current, [field]: value };
          if (field === "first_name" || field === "last_name") {
            next.name = [next.first_name.trim(), next.last_name.trim()]
              .filter(Boolean)
              .join(" ");
          }
          return next;
        });
      },
    }),
    [contact],
  );
  return (
    <LeadContactContext.Provider value={value}>
      {children}
    </LeadContactContext.Provider>
  );
}

export function useLeadContact() {
  const context = useContext(LeadContactContext);
  if (!context)
    throw new Error("useLeadContact must be used inside LeadContactProvider");
  return context;
}

export { validContactEmail } from "./email";
