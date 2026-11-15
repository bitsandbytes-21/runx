import { createApiDeps } from "@/lib/api/create-deps";
import { deleteProgress, getProgress, putProgress } from "@/lib/api/handlers";

type Context = { params: Promise<{ episodeId: string }> };

export async function GET(request: Request, { params }: Context) {
  return getProgress(createApiDeps(), request, (await params).episodeId);
}

export async function PUT(request: Request, { params }: Context) {
  return putProgress(createApiDeps(), request, (await params).episodeId);
}

export async function DELETE(request: Request, { params }: Context) {
  return deleteProgress(createApiDeps(), request, (await params).episodeId);
}
