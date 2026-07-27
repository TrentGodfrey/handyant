export async function POST() {
  return Response.json(
    {
      error: "Photo URL imports are retired. Upload image data through /api/photos.",
    },
    { status: 410 },
  );
}
