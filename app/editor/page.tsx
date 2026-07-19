import EditorComponent from "@/components/Editor";
import GitHubSignInButton from "@/components/GitHubSignInButton";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { getProvider } from "@/lib/runtime/provider";

export default async function EditorPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const session = await getServerSession(authOptions);
  const defaultType = searchParams.type === "blog" ? "blog" : "memo";

  // Editing requires a writable provider (local, or GitHub with a token).
  if (!getProvider(session?.accessToken).canWrite()) {
    return <GitHubSignInButton />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <EditorComponent defaultType={defaultType} />
    </div>
  );
}
