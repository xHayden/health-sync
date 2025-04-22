"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus, RefreshCw } from "lucide-react";
import { WidgetSetting } from "@/lib/widgetRegistry";
import { DBCounter, Counter as CounterType } from "@/types/HealthData";
import { AdditionalHooks } from "../WidgetDisplay";
import { count } from "console";

export interface CounterProps {
  counters: DBCounter[];
  additionalHooks: AdditionalHooks;
  settings: WidgetSetting[];
}

const Counter: React.FC<CounterProps> = ({
  counters,
  additionalHooks,
  settings,
}) => {
  const [selectedCounter, setSelectedCounter] = useState<DBCounter | undefined>(undefined);
  const dataSourceValue = settings.find((s) => s.key === "dataSource")?.value;
  const [needsDataSource, setNeedsDataSource] = useState(
    counters ? counters.length == 0 : true
  );
  const updateCounter = additionalHooks.updateCounter;

  useEffect(() => {
    if (!dataSourceValue || !counters || counters.length == 0) {
      setNeedsDataSource(true);
    }
    setSelectedCounter(counters.find(c => c.id == dataSourceValue))
  }, [dataSourceValue, counters, selectedCounter]);

  const handleIncrement = () => {
    console.log(selectedCounter)
    if (!selectedCounter) return;
    const newValue = selectedCounter.value + 1;
    updateCounter.mutate({ id: selectedCounter.id, value: newValue });
  };

  const handleDecrement = () => {
    if (!selectedCounter) return;
    const newValue = selectedCounter.value - 1;
    updateCounter.mutate({ id: selectedCounter.id, value: newValue });
  };

  const handleReset = () => {
    if (!selectedCounter) return;
    const newValue = 0;
    updateCounter.mutate({ id: selectedCounter.id, value: newValue });
  };

  const cardName = useMemo(() => {
    return (
      settings.find((setting) => setting.key === "cardName")?.value ??
      "New Card"
    );
  }, [settings]);

  useEffect(() => {
    if (!counters || !counters.length) {
      setNeedsDataSource(true);
    }
  }, [counters]);

  return (
    <Card className="w-full mx-8">
      <CardHeader className="flex items-center text-xl">
        {cardName ?? "Counter"}
      </CardHeader>
      <CardContent className="flex items-center justify-between my-12">
        {!needsDataSource ? (
          <>
            <Button
              variant="outline"
              onClick={handleDecrement}
            >
              <Minus size={32} />
            </Button>
            <span className="text-8xl font-semibold">{selectedCounter?.value}</span>
            <Button
              variant="outline"
              size={"lg"}
              onClick={handleIncrement}
            >
              <Plus size={32} />
            </Button>
          </>
        ) : (
          <div className="flex flex-col justify-center items-center text-center w-full">
            <p className="font-bold">Needs Counter Data Source</p>
            <p>(Select in Settings)</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <Button
          variant="ghost"
          disabled={needsDataSource}
          onClick={handleReset}
        >
          <RefreshCw size={32} className="mr-2" />
          Reset
        </Button>
      </CardFooter>
    </Card>
  );
};

export default Counter;
