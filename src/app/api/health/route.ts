import { storeBackendDetail, storeBackendName } from "@/lib/store";

export const dynamic = "force-dynamic";

const BUILD_TIME = new Date().toISOString();

export async function GET() {
  return Response.json({
    ok: true,
    buildTime: BUILD_TIME,
    store: { backend: storeBackendName(), detail: storeBackendDetail() },
  });
}
