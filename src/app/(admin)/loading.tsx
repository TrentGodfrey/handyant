export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div
        className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
