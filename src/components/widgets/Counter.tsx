"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { WidgetSetting } from "@/lib/widgetRegistry";
import { DBCounter, Counter as CounterType } from "@/types/HealthData";
import { AdditionalHooks } from "../WidgetDisplay";

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
  const [selectedCounter, setSelectedCounter] = useState<DBCounter | undefined>(
    undefined
  );
  const dataSourceValue = settings.find((s) => s.key === "dataSource")?.value;
  const [needsDataSource, setNeedsDataSource] = useState(
    counters ? counters.length == 0 : true
  );
  const updateCounter = additionalHooks?.updateCounter;

  useEffect(() => {
    if (!dataSourceValue || !counters || counters.length == 0) {
      setNeedsDataSource(true);
      return;
    }
    setSelectedCounter(counters.find((c) => c.id == dataSourceValue));
  }, [dataSourceValue, counters, selectedCounter]);

  const handleIncrement = (n: number = 1) => {
    console.log(selectedCounter);
    if (!selectedCounter) return;
    const newValue = selectedCounter.value + n;
    updateCounter.mutate({ id: selectedCounter.id, value: newValue });
  };

  const handleDecrement = (n: number = 1) => {
    if (!selectedCounter) return;
    const newValue = selectedCounter.value - n;
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
    <div className="w-full mx-8 bg-transparent">
      <CardHeader className="flex items-center text-xl">
        {cardName ?? "Counter"}
      </CardHeader>
      <CardContent className="flex items-center justify-between my-12">
        {!needsDataSource ? (
          <>
                        <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size={"lg"}
                onClick={() => handleDecrement(1)}
              >
                -1
              </Button>
              <Button
                variant="outline"
                size={"lg"}
                onClick={() => handleDecrement(5)}
              >
                -5
              </Button>
              <Button
                variant="outline"
                size={"lg"}
                onClick={() => handleDecrement(10)}
              >
                -10
              </Button>
            </div>
            <span className="text-8xl font-semibold">
              {selectedCounter?.value}
            </span>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size={"lg"}
                onClick={() => handleIncrement(1)}
              >
                +1
              </Button>
              <Button
                variant="outline"
                size={"lg"}
                onClick={() => handleIncrement(5)}
              >
                +5
              </Button>
              <Button
                variant="outline"
                size={"lg"}
                onClick={() => handleIncrement(10)}
              >
                +10
              </Button>
            </div>
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
    </div>
  );
};

export default Counter;
