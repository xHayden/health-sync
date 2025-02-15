"use client";

import Dashboard from "@/components/Dashboard";
import { useLayoutContext } from "@/components/LayoutContext";
import { useEffect } from "react";

const EditWidgetPanelPage = () => {
    const { hasLayoutChanged } = useLayoutContext();
    useEffect(() => {
        if (hasLayoutChanged) {
            const handleBeforeUnload = (event: BeforeUnloadEvent) => {
                event.preventDefault();
                event.returnValue = true;
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        }
    }, [hasLayoutChanged]);

    return <div>
        <Dashboard editMode={true} />
    </div>
}

export default EditWidgetPanelPage;