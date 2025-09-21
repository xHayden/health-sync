import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="">
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-6xl mb-2">:(</p>
        <div className="text-center">
          <h1>This project has been deprecated and is no longer maintained.</h1>
          <p>Updates will be irregular and are not guaranteed.</p>
        </div>
        <Link href="/dashboard"><Button>Go to Dashboard</Button></Link>
      </div>
    </main>
  );
}
