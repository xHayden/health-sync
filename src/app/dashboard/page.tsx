import Dashboard from "@/components/Dashboard";
import DashboardMenubar from "@/components/DashboardMenubar";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getLayouts } from "@/utils/db";

const DashboardPage = async () => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
    return null;
  }

  const layouts = await getLayouts(session.user.id);
  return (
    <div>
      <DashboardMenubar user={session.user} editMode={false} layouts={layouts} />
      <Dashboard editMode={false} user={session.user} layouts={layouts} />
    </div>
  );
};

export default DashboardPage;