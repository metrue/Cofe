import EditorComponent from "@/components/Editor";
import GitHubSignInButton from "@/components/GitHubSignInButton";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { isLocalMode } from "@/lib/runtime/mode";

export default async function EditorPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const session = await getServerSession(authOptions);
  const defaultType = searchParams.type === "blog" ? "blog" : "memo";

  // Local mode (npx cofe --data) is the trusted local owner — no sign-in needed.
  if (!session && !isLocalMode()) {
    const username = process.env.GITHUB_USERNAME;
    if (!username) {
      return <GitHubSignInButton />;
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <EditorComponent defaultType={defaultType} />
    </div>
  );
}
