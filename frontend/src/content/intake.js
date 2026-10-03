export const intakePlans = [
  "Launch",
  "Business",
  "Professional",
  "Custom",
  "I need a recommendation",
];

// These discovery answers use fields already supported by the backend.
export function buildBriefPayload(form) {
  const { decision_maker, ...brief } = form;
  return {
    ...brief,
    launch_date: brief.launch_date || null,
    brand: brief.brand,
    notes: [
      decision_maker && `Project approver: ${decision_maker}`,
      brief.notes,
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

export const intakeReviewGroups = [
  {
    title: "Contact & business",
    step: 0,
    fields: [
      ["name", "Your name"],
      ["email", "Email"],
      ["company", "Business or project"],
      ["business_type", "Business category"],
      ["service_interest", "Service interest"],
      ["phone", "Phone"],
      ["overview", "Your idea"],
      ["mission", "Audience & what makes you different"],
      ["domain", "Current website or domain"],
    ],
  },
  {
    title: "Project direction",
    step: 1,
    fields: [
      ["goal", "Main goal"],
      ["success", "What success looks like"],
      ["features", "Pages & features"],
      ["package", "Starting package"],
      ["launch_date", "Ideal launch date"],
      ["inspiration_link", "Inspiration website"],
      ["offerings", "Products or services"],
      ["content_readiness", "Content readiness"],
      ["brand", "Brand direction"],
      ["content_readiness", "Content readiness"],
      ["integrations", "Tools & integrations"],
      ["decision_maker", "Project approver"],
    ],
  },
];
