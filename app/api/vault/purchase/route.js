import { purchaseItemServer, toResponse } from "@/lib/server";

export const POST = toResponse(purchaseItemServer);
