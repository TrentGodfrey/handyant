import { retiredBillingResponse } from "@/lib/retired-billing";

export async function POST() {
  return retiredBillingResponse();
}
