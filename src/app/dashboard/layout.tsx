import DashboardMenubar from "@/components/DashboardMenubar";
import LayoutProvider from "@/components/LayoutContext";

const DashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
  // todo: get user id from session
}) => {
  return (
    <section>
      <LayoutProvider userId={1} enabled={true}>
        <DashboardMenubar userId={1} />
        {children}
      </LayoutProvider>
    </section>
  );
};

export default DashboardLayout;