import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Dashboard from "@/components/Dashboard";
import DashboardMenubar from "@/components/DashboardMenubar";
import WidgetSearchModal from "@/components/WidgetSearchModal";
import { getLayouts } from "@/utils/db";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

const EditWidgetPanelPage = async ({ editMode = true }: { userId: number, editMode?: boolean }) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }

  // useEffect(() => {
  //   if (hasLayoutChanged) {
  //     const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  //       event.preventDefault();
  //       event.returnValue = "";
  //     };
  //     window.addEventListener("beforeunload", handleBeforeUnload);
  //     return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  //   }
  // }, [hasLayoutChanged]);
  const layouts = await getLayouts(session.user.id);

  return (
    <>
      <DashboardMenubar user={session.user} editMode={editMode} layouts={layouts} />
      <Dashboard editMode={editMode} user={session.user} layouts={layouts} />
      <WidgetSearchModal />
    </>
  );
};

export default EditWidgetPanelPage;