import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
    return null;
  }

  return (
    <section>
      {children}
    </section>
  );
};

export default DashboardLayout;
