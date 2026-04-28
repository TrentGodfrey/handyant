import Spinner from "@/components/Spinner";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner className="h-7 w-7" />
    </div>
  );
}
