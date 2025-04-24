import { authOptions } from "@/lib/authOptions";
import Dashboard from "@/components/Dashboard";
import DashboardMenubar from "@/components/menubar/DashboardMenubar";
import WidgetSearchModal from "@/components/WidgetSearchModal";
import { getLayouts, getSharedLayoutsForMember } from "@/utils/db";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  SharedLayoutWithOwner,
} from "@/types/WidgetData";

const EditWidgetPanelPage = async () => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }

  const userLayouts = await getLayouts(session.user.id, true);
  const sharedLayoutsData = await getSharedLayoutsForMember(session.user.id);
  const sharedLayouts = sharedLayoutsData.map(
    (shared: SharedLayoutWithOwner) => shared.layout
  );

  return (
    <>
      <DashboardMenubar
        user={session.user}
        editMode={true}
        userLayouts={userLayouts}
        sharedLayouts={sharedLayouts}
      />
      <Dashboard editMode={true} user={session.user} />
      <WidgetSearchModal />
    </>
  );
};

export default EditWidgetPanelPage;
