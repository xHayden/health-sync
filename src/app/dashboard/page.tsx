import Dashboard from "@/components/Dashboard";
import DashboardMenubar from "@/components/menubar/DashboardMenubar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { getLayouts, getSharedLayoutsForMember } from "@/utils/db";
import { SharedLayoutWithOwner } from "@/types/WidgetData";

const DashboardPage = async () => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
    return null;
  }
  const userLayouts = await getLayouts(session.user.id, true);
  const sharedLayoutsData = await getSharedLayoutsForMember(session.user.id);
  const sharedLayouts = sharedLayoutsData.map(
    (shared: SharedLayoutWithOwner) => shared.layout
  );

  return (
    <div>
      <DashboardMenubar
        user={session.user}
        editMode={false}
        userLayouts={userLayouts}
        sharedLayouts={sharedLayouts}
      />
      <Dashboard editMode={false} user={session.user} />
    </div>
  );
};

export default DashboardPage;
