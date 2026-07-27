export function retiredBillingResponse(): Response {
  return Response.json(
    { error: "Billing is managed directly by MCQ in Square." },
    { status: 410 },
  );
}
